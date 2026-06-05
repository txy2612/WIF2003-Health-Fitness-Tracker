import env from '../../config/env.js'
import mailer from '../../shared/mailer.js'
import profileModel from '../profile/profileModel.js'// get user's email
import notificationModel from './notificationModel.js'
import reminderEmailService from './reminderEmailService.js'

// After send email:
// success -> mark sent
// failure -> mark failed

// What is a lock?
// At reminder time, 2 workers find email & think shud send
// Lock -> when lock only one can send

// Overview (how reminders work): find due reminders -> send email -> mark sent
// Core business logic

function getExpiredLockDate() {
  return new Date(Date.now() - env.REMINDER_SEND_LOCK_MINUTES * 60 * 1000)
}

// Purpose: find reminders that need sending
function buildDueReminderFilter(now = new Date()) {
  return {
    scheduledFor: { $lte: now },// reminder time rch
    completed: false,// AND not comlpeted 
    emailSentAt: null,// AND not sent
    // lock 
    $or: [
      { emailSendLockedAt: null },
      { emailSendLockedAt: { $exists: false } },
      { emailSendLockedAt: { $lte: getExpiredLockDate() } },
    ],
  }
}

// Purpose: get recipient email
async function getReminderRecipient() {
  const profile = await profileModel
    .findOne({
      email: { $exists: true, $ne: '' },
    })
    .sort({ createdAt: -1 })
    .lean()

  if (profile?.email) return profile

  // Useful for local testing when the profile page has not saved an email yet.
  const fallbackEmail = env.REMINDER_RECIPIENT_EMAIL || (env.NODE_ENV === 'development' ? env.SMTP_USER : '')
  if (!fallbackEmail) return null

  return {
    email: fallbackEmail,
    timezone: env.REMINDER_TIMEZONE,
  }
}


async function claimReminder(reminderId) {
  return notificationModel
    .findOneAndUpdate(
      {
        _id: reminderId,
        ...buildDueReminderFilter(),
      },
      {
        $set: {
          emailSendLockedAt: new Date(),
          lastSendError: null,
        },
        $inc: {
          sendAttempts: 1,
        },
      },
      { new: true }
    )
    .lean()
}

async function markReminderSent(reminderId) {
  return notificationModel.updateOne(
    { _id: reminderId },
    {
      $set: {
        emailSentAt: new Date(),
        emailSendLockedAt: null,
        lastSendError: null,
      },
    }
  )
}

async function markReminderFailed(reminderId, error) {
  const errorMessage = error instanceof Error ? error.message : String(error)

  return notificationModel.updateOne(
    { _id: reminderId },
    {
      $set: {
        emailSendLockedAt: null,
        lastSendError: errorMessage.slice(0, 500),
      },
    }
  )
}

async function markDueRemindersSkipped(reason) {
  return notificationModel.updateMany(
    buildDueReminderFilter(),
    {
      $set: {
        lastSendError: reason.slice(0, 500),
      },
    }
  )
}

async function processDueReminders() {
  if (!mailer.isSmtpConfigured()) {
    console.warn('Reminder processor skipped: SMTP_HOST is not configured.')
    await markDueRemindersSkipped('SMTP_HOST is not configured.')
    return { processed: 0, sent: 0, failed: 0, skippedReason: 'smtp-not-configured' }
  }

  const recipient = await getReminderRecipient()

  if (!recipient?.email) {
    console.warn('Reminder processor skipped: no profile email found.')
    await markDueRemindersSkipped('No profile email or REMINDER_RECIPIENT_EMAIL found.')
    return { processed: 0, sent: 0, failed: 0, skippedReason: 'missing-recipient' }
  }

  // Find due reminders
  const reminders = await notificationModel
    .find(buildDueReminderFilter())
    .sort({ scheduledFor: 1 })
    .limit(env.REMINDER_BATCH_SIZE)
    .lean()

  const result = {
    processed: 0,
    sent: 0,
    failed: 0,
  }

  // Loop thur reminders, process them one by one
  for (const reminder of reminders) {
    const claimedReminder = await claimReminder(reminder._id)

    if (!claimedReminder) continue

    result.processed += 1

    try {
      // ACTUALLY Send email, by calling reminderEmailService
      await reminderEmailService.sendReminderEmail({
        to: recipient.email,
        title: claimedReminder.title,
        message: claimedReminder.message,
        scheduledFor: claimedReminder.scheduledFor,
        timezone: recipient.timezone || env.REMINDER_TIMEZONE,
      })

      // Success -> remember that email was sent
      await markReminderSent(claimedReminder._id)
      result.sent += 1
    } catch (error) {
      // Failure -> rmb that sending failed
      // stores id & error
      await markReminderFailed(claimedReminder._id, error)
      result.failed += 1
    }
  }

  return result
}

export {
  buildDueReminderFilter,
  processDueReminders,
}

export default {
  buildDueReminderFilter,
  processDueReminders,
}
