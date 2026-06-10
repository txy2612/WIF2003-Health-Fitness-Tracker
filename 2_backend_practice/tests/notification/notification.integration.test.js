import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../../src/app.js'
import env from '../../src/config/env.js'
import profileModel from '../../src/modules/profile/profileModel.js'
import notificationModel from '../../src/modules/notification/notificationModel.js'

let mongoServer
let user
let otherUser
let token
let otherToken

const futureDate = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())

  user = await profileModel.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'password123',
  })

  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
  otherToken = jwt.sign({ id: otherUser._id }, env.JWT_SECRET)
})

afterEach(async () => {
  await notificationModel.deleteMany({})
})

afterAll(async () => {
  await profileModel.deleteMany({})
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('Notification Integration Tests', () => {
  test('GET /api/v1/notification should require auth', async () => {
    const response = await request(app).get('/api/v1/notification')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Unauthorized')
  })

  test('POST /api/v1/notification should create a notification for logged-in user', async () => {
    const response = await request(app)
      .post('/api/v1/notification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'workout',
        title: 'Workout Reminder',
        message: 'Time to exercise',
        scheduledFor: futureDate(),
      })

    expect(response.status).toBe(201)
    expect(response.body.id).toBeDefined()
    expect(response.body.channel).toBe('workout')
    expect(response.body.title).toBe('Workout Reminder')

    const savedNotification = await notificationModel.findById(response.body.id).lean()
    expect(savedNotification).not.toBeNull()
    expect(String(savedNotification.userId)).toBe(String(user._id))
  })

  test('POST /api/v1/notification should reject invalid notification payload', async () => {
    const response = await request(app)
      .post('/api/v1/notification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'workout',
        title: '',
        message: '',
        scheduledFor: new Date(Date.now() - 60 * 1000).toISOString(),
      })

    expect(response.status).toBeGreaterThanOrEqual(400)

    const count = await notificationModel.countDocuments({})
    expect(count).toBe(0)
  })

  test('GET /api/v1/notification should return only current user notifications sorted by schedule', async () => {
    await notificationModel.create([
      {
        userId: user._id,
        channel: 'workout',
        title: 'Later',
        message: 'My later reminder',
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      {
        userId: user._id,
        channel: 'nutrition',
        title: 'Sooner',
        message: 'My sooner reminder',
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
      },
      {
        userId: otherUser._id,
        channel: 'hydration',
        title: 'Other User',
        message: 'Other reminder',
        scheduledFor: new Date(Date.now() + 30 * 60 * 1000),
      },
    ])

    const response = await request(app)
      .get('/api/v1/notification')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0].title).toBe('Sooner')
    expect(response.body[1].title).toBe('Later')
  })

  test('PATCH /api/v1/notification/:id should update own notification and persist changes', async () => {
    const created = await notificationModel.create({
      userId: user._id,
      channel: 'hydration',
      title: 'Drink Water',
      message: 'Drink now',
      scheduledFor: futureDate(),
    })

    const response = await request(app)
      .patch(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        completed: true,
        read: true,
      })

    expect(response.status).toBe(200)
    expect(response.body.completed).toBe(true)
    expect(response.body.read).toBe(true)

    const savedNotification = await notificationModel.findById(created._id).lean()
    expect(savedNotification.completed).toBe(true)
    expect(savedNotification.read).toBe(true)
  })

  test('PATCH /api/v1/notification/:id should reject empty patch body', async () => {
    const created = await notificationModel.create({
      userId: user._id,
      channel: 'hydration',
      title: 'Drink Water',
      message: 'Drink now',
      scheduledFor: futureDate(),
    })

    const response = await request(app)
      .patch(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(response.status).toBe(400)
  })

  test('PATCH /api/v1/notification/:id should not update another user notification', async () => {
    const created = await notificationModel.create({
      userId: otherUser._id,
      channel: 'hydration',
      title: 'Other Reminder',
      message: 'Not yours',
      scheduledFor: futureDate(),
    })

    const response = await request(app)
      .patch(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        completed: true,
      })

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Notification not found')

    const savedNotification = await notificationModel.findById(created._id).lean()
    expect(savedNotification.completed).toBe(false)
  })

  test('DELETE /api/v1/notification/:id should delete own notification', async () => {
    const created = await notificationModel.create({
      userId: user._id,
      channel: 'system',
      title: 'Delete Me',
      message: 'Delete test',
      scheduledFor: futureDate(),
    })

    const response = await request(app)
      .delete(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Notification deleted successfully')

    const savedNotification = await notificationModel.findById(created._id).lean()
    expect(savedNotification).toBeNull()
  })

  test('DELETE /api/v1/notification/:id should not delete another user notification', async () => {
    const created = await notificationModel.create({
      userId: otherUser._id,
      channel: 'system',
      title: 'Other User Notification',
      message: 'Cannot delete',
      scheduledFor: futureDate(),
    })

    const response = await request(app)
      .delete(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Notification not found')

    const savedNotification = await notificationModel.findById(created._id).lean()
    expect(savedNotification).not.toBeNull()
  })
})
