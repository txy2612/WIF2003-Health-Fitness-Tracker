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
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await profileModel.deleteMany({})
  await notificationModel.deleteMany({})

  user = await profileModel.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'hashedpassword',
  })

  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
  otherToken = jwt.sign({ id: otherUser._id }, env.JWT_SECRET)
})

describe('Notification Functional Tests', () => {
  test('GET /api/v1/notification without token returns 401', async () => {
    const res = await request(app).get('/api/v1/notification')

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Unauthorized')
  })

  test('POST /api/v1/notification creates notification', async () => {
    const res = await request(app)
      .post('/api/v1/notification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'workout',
        title: 'Workout Reminder',
        message: 'Time to exercise',
        scheduledFor: futureDate(),
      })

    expect(res.statusCode).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.channel).toBe('workout')
    expect(res.body.title).toBe('Workout Reminder')
  })

  test('POST /api/v1/notification rejects past scheduledFor', async () => {
    const res = await request(app)
      .post('/api/v1/notification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'workout',
        title: 'Past Reminder',
        message: 'Invalid reminder',
        scheduledFor: new Date(Date.now() - 60 * 1000).toISOString(),
      })

    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })

  test('GET /api/v1/notification returns only current user notifications', async () => {
    await notificationModel.create({
      userId: user._id,
      channel: 'workout',
      title: 'Mine',
      message: 'My reminder',
      scheduledFor: futureDate(),
    })

    await notificationModel.create({
      userId: otherUser._id,
      channel: 'nutrition',
      title: 'Not Mine',
      message: 'Other reminder',
      scheduledFor: futureDate(),
    })

    const res = await request(app)
      .get('/api/v1/notification')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Mine')
  })

  test('PATCH /api/v1/notification/:id updates own notification', async () => {
    const created = await notificationModel.create({
      userId: user._id,
      channel: 'hydration',
      title: 'Drink Water',
      message: 'Drink now',
      scheduledFor: futureDate(),
    })

    const res = await request(app)
      .patch(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        completed: true,
        read: true,
      })

    expect(res.statusCode).toBe(200)
    expect(res.body.completed).toBe(true)
    expect(res.body.read).toBe(true)
  })

  test('PATCH /api/v1/notification/:id cannot update other user notification', async () => {
    const created = await notificationModel.create({
      userId: otherUser._id,
      channel: 'hydration',
      title: 'Other Reminder',
      message: 'Not yours',
      scheduledFor: futureDate(),
    })

    const res = await request(app)
      .patch(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        completed: true,
      })

    expect(res.statusCode).toBe(404)
    expect(res.body.message).toBe('Notification not found')
  })

  test('DELETE /api/v1/notification/:id deletes own notification', async () => {
    const created = await notificationModel.create({
      userId: user._id,
      channel: 'system',
      title: 'Delete Me',
      message: 'Delete test',
      scheduledFor: futureDate(),
    })

    const res = await request(app)
      .delete(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.statusCode).toBe(200)
    expect(res.body.message).toBe('Notification deleted successfully')
    expect(res.body.data.title).toBe('Delete Me')
  })

  test('DELETE /api/v1/notification/:id cannot delete other user notification', async () => {
    const created = await notificationModel.create({
      userId: otherUser._id,
      channel: 'system',
      title: 'Other User Notification',
      message: 'Cannot delete',
      scheduledFor: futureDate(),
    })

    const res = await request(app)
      .delete(`/api/v1/notification/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.statusCode).toBe(404)
    expect(res.body.message).toBe('Notification not found')
  })
})