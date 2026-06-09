import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import notificationService from '../../src/modules/notification/notificationService.js'
import notificationModel from '../../src/modules/notification/notificationModel.js'

let mongoServer
let userId

const futureDate = () => new Date(Date.now() + 60 * 60 * 1000)

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await notificationModel.deleteMany({})
  userId = new mongoose.Types.ObjectId()
})

describe('Notification Unit Tests', () => {
  test('createNotification creates notification and returns DTO', async () => {
    const notification = await notificationService.createNotification(userId, {
      channel: 'workout',
      title: 'Workout Reminder',
      message: 'Time to exercise',
      scheduledFor: futureDate(),
    })

    expect(notification.id).toBeDefined()
    expect(notification.channel).toBe('workout')
    expect(notification.type).toBe('workout')
    expect(notification.title).toBe('Workout Reminder')
    expect(notification.completed).toBe(false)
    expect(notification.read).toBe(false)
  })

  test('getNotifications returns only current user notifications', async () => {
    const otherUserId = new mongoose.Types.ObjectId()

    await notificationModel.create({
      userId,
      channel: 'workout',
      title: 'Mine',
      message: 'My reminder',
      scheduledFor: futureDate(),
    })

    await notificationModel.create({
      userId: otherUserId,
      channel: 'nutrition',
      title: 'Not Mine',
      message: 'Other reminder',
      scheduledFor: futureDate(),
    })

    const result = await notificationService.getNotifications(userId)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Mine')
  })

  test('updateNotification updates own notification', async () => {
    const created = await notificationModel.create({
      userId,
      channel: 'hydration',
      title: 'Drink Water',
      message: 'Drink now',
      scheduledFor: futureDate(),
    })

    const updated = await notificationService.updateNotification(
      userId,
      created._id,
      { completed: true, read: true }
    )

    expect(updated.completed).toBe(true)
    expect(updated.read).toBe(true)
  })

  test('updateNotification returns null for other user notification', async () => {
    const otherUserId = new mongoose.Types.ObjectId()

    const created = await notificationModel.create({
      userId: otherUserId,
      channel: 'hydration',
      title: 'Other User Reminder',
      message: 'Not yours',
      scheduledFor: futureDate(),
    })

    const updated = await notificationService.updateNotification(
      userId,
      created._id,
      { completed: true }
    )

    expect(updated).toBeNull()
  })

  test('deleteNotification deletes own notification', async () => {
    const created = await notificationModel.create({
      userId,
      channel: 'system',
      title: 'Delete Me',
      message: 'Testing delete',
      scheduledFor: futureDate(),
    })

    const deleted = await notificationService.deleteNotification(userId, created._id)

    expect(deleted.title).toBe('Delete Me')
  })

  test('deleteNotification returns null if notification does not belong to user', async () => {
    const otherUserId = new mongoose.Types.ObjectId()

    const created = await notificationModel.create({
      userId: otherUserId,
      channel: 'system',
      title: 'Other User Notification',
      message: 'Cannot delete this',
      scheduledFor: futureDate(),
    })

    const deleted = await notificationService.deleteNotification(userId, created._id)

    expect(deleted).toBeNull()
  })
})