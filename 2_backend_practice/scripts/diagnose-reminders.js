import net from 'node:net'
import mongoose from 'mongoose'
import connectDatabase from '../src/config/database.js'
import env from '../src/config/env.js'
import mailer from '../src/shared/mailer.js'
import profileModel from '../src/modules/profile/profileModel.js'
import notificationModel from '../src/modules/notification/notificationModel.js'
import { buildDueReminderFilter } from '../src/modules/notification/reminderProcessor.js'

function testPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })

    const finish = (isOpen) => {
      socket.destroy()
      resolve(isOpen)
    }

    socket.setTimeout(2000)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function checkSmtp() {
  if (!mailer.isSmtpConfigured()) {
    return { configured: false, verified: false, error: 'SMTP_HOST is missing' }
  }

  try {
    await mailer.verifySmtpConnection()
    return { configured: true, verified: true, error: null }
  } catch (error) {
    return { configured: true, verified: false, error: error.message }
  }
}

function summarizeReminder(reminder) {
  return {
    id: String(reminder._id),
    title: reminder.title,
    scheduledFor: reminder.scheduledFor,
    completed: reminder.completed,
    emailSentAt: reminder.emailSentAt,
    sendAttempts: reminder.sendAttempts,
    lastSendError: reminder.lastSendError,
  }
}

async function main() {
  const portOpen = await testPort(env.PORT)
  const smtp = await checkSmtp()

  await connectDatabase()

  const recipient = await profileModel
    .findOne({ email: { $exists: true, $ne: '' } })
    .sort({ createdAt: -1 })
    .lean()

  const fallbackEmail = env.REMINDER_RECIPIENT_EMAIL || (env.NODE_ENV === 'development' ? env.SMTP_USER : '')
  const effectiveEmail = recipient?.email || fallbackEmail

  const dueReminders = await notificationModel
    .find(buildDueReminderFilter(new Date()))
    .sort({ scheduledFor: 1 })
    .limit(10)
    .lean()

  const recentFailures = await notificationModel
    .find({ lastSendError: { $exists: true, $ne: null } })
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean()

  console.log(JSON.stringify({
    backend: {
      expectedPort: env.PORT,
      portOpen,
      schedulerRunsWhenBackendRuns: true,
    },
    smtp,
    recipient: {
      exists: Boolean(effectiveEmail),
      source: recipient?.email ? 'profile' : fallbackEmail ? 'fallback' : null,
      emailDomain: effectiveEmail ? effectiveEmail.split('@')[1] : null,
      timezone: recipient?.timezone || env.REMINDER_TIMEZONE || null,
    },
    reminders: {
      dueUnsentCount: dueReminders.length,
      dueUnsent: dueReminders.map(summarizeReminder),
      recentFailures: recentFailures.map(summarizeReminder),
    },
  }, null, 2))

  await mongoose.disconnect()
}

await main()
