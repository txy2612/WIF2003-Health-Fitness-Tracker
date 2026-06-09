import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../../src/app.js'
import env from '../../src/config/env.js'
import profileModel from '../../src/modules/profile/profileModel.js'
import fitnessTrackerModel from '../../src/modules/fitness-tracker/fitnessTrackerModel.js'

let mongoServer
let token
let user
let otherUser
let otherToken

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()

  await mongoose.connect(mongoServer.getUri())

  await fitnessTrackerModel.syncIndexes()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await profileModel.deleteMany({})
  await fitnessTrackerModel.deleteMany({})

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

describe('Fitness Tracker Functional Tests', () => {
  test('GET /api/v1/fitness-tracker without token returns 401', async () => {
    const res = await request(app).get('/api/v1/fitness-tracker')

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Unauthorized')
  })

  test('GET /api/v1/fitness-tracker/activities without token returns 401', async () => {
    const res = await request(app).get('/api/v1/fitness-tracker/activities')

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Unauthorized')
  })

  test('POST /activities creates a workout activity', async () => {
    const res = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: 'workout-1',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        steps: 0,
        calories: 250,
        date: '2026-06-09',
        notes: 'Morning run',
      })

    expect(res.statusCode).toBe(201)
    expect(res.body.id).toBe('workout-1')
    expect(res.body.type).toBe('workout')
    expect(res.body.activity).toBe('Running')
    expect(res.body.userId).toBeUndefined()
    expect(res.body._id).toBeUndefined()
  })

  test('POST /activities creates a steps activity', async () => {
    const res = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: 'steps-1',
        type: 'steps',
        duration: 0,
        steps: 8000,
        calories: 180,
        date: '2026-06-09',
      })

    expect(res.statusCode).toBe(201)
    expect(res.body.id).toBe('steps-1')
    expect(res.body.type).toBe('steps')
    expect(res.body.steps).toBe(8000)
  })

  test('POST duplicate steps on same date for same user returns 409', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'steps-1',
      type: 'steps',
      steps: 5000,
      calories: 100,
      date: '2026-06-09',
    })

    const res = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: 'steps-2',
        type: 'steps',
        steps: 7000,
        calories: 150,
        date: '2026-06-09',
      })

    expect(res.statusCode).toBe(409)
    expect(res.body.title).toBe('Duplicate steps activity')
  })

  test('same date steps is allowed for different users', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'steps-1',
      type: 'steps',
      steps: 5000,
      calories: 100,
      date: '2026-06-09',
    })

    const res = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        id: 'steps-1',
        type: 'steps',
        steps: 7000,
        calories: 150,
        date: '2026-06-09',
      })

    expect(res.statusCode).toBe(201)
  })

  test('GET /activities returns only current user activities', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'my-workout',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    await fitnessTrackerModel.create({
      userId: otherUser._id,
      id: 'other-workout',
      type: 'workout',
      activity: 'Cycling',
      duration: 45,
      calories: 300,
      date: '2026-06-09',
    })

    const res = await request(app)
      .get('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.activities).toHaveLength(1)
    expect(res.body.activities[0].id).toBe('my-workout')
  })

  test('GET /api/v1/fitness-tracker returns overview summary', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-1',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-2',
      type: 'workout',
      activity: 'Cycling',
      duration: 60,
      calories: 400,
      date: '2026-06-10',
    })

    const res = await request(app)
      .get('/api/v1/fitness-tracker')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.totalCalories).toBe(650)
    expect(res.body.weeklyGoal.completedMinutes).toBe(90)
    expect(res.body.weeklyGoal.workoutsCompleted).toBe(2)
    expect(res.body.goalProgressPercent).toBe(30)
  })

  test('DELETE /activities/:id deletes own activity', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'delete-me',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    const res = await request(app)
      .delete('/api/v1/fitness-tracker/activities/delete-me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.message).toBe('Activity deleted successfully')
    expect(res.body.data.id).toBe('delete-me')
  })

  test('DELETE /activities/:id cannot delete other user activity', async () => {
    await fitnessTrackerModel.create({
      userId: otherUser._id,
      id: 'other-activity',
      type: 'workout',
      activity: 'Cycling',
      duration: 45,
      calories: 300,
      date: '2026-06-09',
    })

    const res = await request(app)
      .delete('/api/v1/fitness-tracker/activities/other-activity')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(404)
    expect(res.body.message).toBe('Activity not found')
  })

  test('invalid fitness tracker route returns 404', async () => {
    const res = await request(app)
      .get('/api/v1/fitness-tracker/unknown-route')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(404)
  })
})