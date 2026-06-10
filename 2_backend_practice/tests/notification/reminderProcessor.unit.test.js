import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { jest } from '@jest/globals'

let mongoServer
let notificationModel
let profileModel
let buildDueReminderFilter
let processDueReminders
let mailer
let reminderEmailService

// Setup
// 1. beforeAll(...)
// 2. beforeEach(...)
// 3. afetrAll(...)
// create temp MongoDB, create fake users, create fake reminders, clean db after each tests
beforeAll(async () => {
    // pretend to send email (dont actually send it)
  jest.unstable_mockModule('../../src/shared/mailer.js', () => ({
    default: {
      isSmtpConfigured: jest.fn(),
    },
  }))

  jest.unstable_mockModule('../../src/modules/notification/reminderEmailService.js', () => ({
    default: {
      sendReminderEmail: jest.fn(),
    },
  }))

  notificationModel = (await import('../../src/modules/notification/notificationModel.js')).default
  profileModel = (await import('../../src/modules/profile/profileModel.js')).default
  mailer = (await import('../../src/shared/mailer.js')).default
  reminderEmailService = (await import('../../src/modules/notification/reminderEmailService.js')).default

  const processor = await import('../../src/modules/notification/reminderProcessor.js')
  // checks reminder is: due/not completed/not alr sent/not locked
  buildDueReminderFilter = processor.buildDueReminderFilter
  processDueReminders = processor.processDueReminders

  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  jest.clearAllMocks()
  await profileModel.deleteMany({})
  await notificationModel.deleteMany({})
})

describe('Reminder Processor Unit Tests', () => {
  test('buildDueReminderFilter finds due unsent reminders', () => {
    const now = new Date('2026-06-09T10:00:00Z')
    const filter = buildDueReminderFilter(now)

    expect(filter.userId).toEqual({ $exists: true, $ne: null })
    expect(filter.scheduledFor).toEqual({ $lte: now })
    expect(filter.completed).toBe(false)
    expect(filter.emailSentAt).toBe(null)
    expect(filter.$or).toBeDefined()
  })

  test('processDueReminders skips when SMTP is not configured', async () => {
    // simulates email server missing
    // expected = skip processing
    mailer.isSmtpConfigured.mockReturnValue(false)

    const result = await processDueReminders()

    expect(result).toEqual({
      processed: 0,
      sent: 0,
      failed: 0,
      skippedReason: 'smtp-not-configured',
    })
  })

  test('processDueReminders sends due reminder email successfully', async () => {
    mailer.isSmtpConfigured.mockReturnValue(true)
    reminderEmailService.sendReminderEmail.mockResolvedValue({ success: true })

    const user = await profileModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      timezone: 'Asia/Kuala_Lumpur',
    })

    const reminder = await notificationModel.create({
      userId: user._id,
      channel: 'workout',
      title: 'Workout Reminder',
      message: 'Time to exercise',
      scheduledFor: new Date(Date.now() - 60 * 1000),
      completed: false,
      emailSentAt: null,
    })

    const result = await processDueReminders()

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(1)
    expect(result.failed).toBe(0)

    expect(reminderEmailService.sendReminderEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      title: 'Workout Reminder',
      message: 'Time to exercise',
      scheduledFor: reminder.scheduledFor,
      timezone: 'Asia/Kuala_Lumpur',
    })

    const updatedReminder = await notificationModel.findById(reminder._id).lean()

    expect(updatedReminder.emailSentAt).not.toBeNull()
    expect(updatedReminder.emailSendLockedAt).toBeNull()
    expect(updatedReminder.lastSendError).toBeNull()
    expect(updatedReminder.sendAttempts).toBe(1)
  })

  test('processDueReminders marks reminder as failed when owner email is missing', async () => {
    mailer.isSmtpConfigured.mockReturnValue(true)

    const user = await profileModel.create({
      name: 'No Email User',
      email: 'noemail@example.com',
      password: 'hashedpassword',
    })

    await profileModel.updateOne(
      { _id: user._id },
      { $unset: { email: '' } },
      { runValidators: false }
    )

    const reminder = await notificationModel.create({
      userId: user._id,
      channel: 'hydration',
      title: 'Drink Water',
      message: 'Drink now',
      scheduledFor: new Date(Date.now() - 60 * 1000),
      completed: false,
      emailSentAt: null,
    })

    const result = await processDueReminders()

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
    expect(reminderEmailService.sendReminderEmail).not.toHaveBeenCalled()

    const updatedReminder = await notificationModel.findById(reminder._id).lean()

    expect(updatedReminder.emailSentAt).toBeNull()
    expect(updatedReminder.emailSendLockedAt).toBeNull()
    expect(updatedReminder.lastSendError).toBe('Reminder owner profile email not found.')
    expect(updatedReminder.sendAttempts).toBe(1)
  })

  test('processDueReminders marks reminder as failed when email sending throws error', async () => {
    mailer.isSmtpConfigured.mockReturnValue(true)
    reminderEmailService.sendReminderEmail.mockRejectedValue(new Error('SMTP failed'))

    const user = await profileModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
    })

    const reminder = await notificationModel.create({
      userId: user._id,
      channel: 'system',
      title: 'System Reminder',
      message: 'Something happened',
      scheduledFor: new Date(Date.now() - 60 * 1000),
      completed: false,
      emailSentAt: null,
    })

    const result = await processDueReminders()

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)

    const updatedReminder = await notificationModel.findById(reminder._id).lean()

    expect(updatedReminder.emailSentAt).toBeNull()
    expect(updatedReminder.emailSendLockedAt).toBeNull()
    expect(updatedReminder.lastSendError).toBe('SMTP failed')
    expect(updatedReminder.sendAttempts).toBe(1)
  })

  test('processDueReminders ignores future reminders', async () => {
    mailer.isSmtpConfigured.mockReturnValue(true)

    const user = await profileModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
    })

    await notificationModel.create({
      userId: user._id,
      channel: 'workout',
      title: 'Future Reminder',
      message: 'Not yet',
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
      completed: false,
      emailSentAt: null,
    })

    const result = await processDueReminders()

    expect(result.processed).toBe(0)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(reminderEmailService.sendReminderEmail).not.toHaveBeenCalled()
  })

  test('processDueReminders ignores completed reminders', async () => {
    mailer.isSmtpConfigured.mockReturnValue(true)

    const user = await profileModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
    })

    await notificationModel.create({
      userId: user._id,
      channel: 'workout',
      title: 'Completed Reminder',
      message: 'Already done',
      scheduledFor: new Date(Date.now() - 60 * 1000),
      completed: true,
      emailSentAt: null,
    })

    const result = await processDueReminders()

    expect(result.processed).toBe(0)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
  })

  test('processDueReminders ignores already sent reminders', async () => {
    mailer.isSmtpConfigured.mockReturnValue(true)

    const user = await profileModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
    })

    await notificationModel.create({
      userId: user._id,
      channel: 'workout',
      title: 'Already Sent',
      message: 'Sent before',
      scheduledFor: new Date(Date.now() - 60 * 1000),
      completed: false,
      emailSentAt: new Date(),
    })

    const result = await processDueReminders()

    expect(result.processed).toBe(0)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
  })
})