import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../../src/app.js'
import env from '../../src/config/env.js'
import profileModel from '../../src/modules/profile/profileModel.js'
import fitnessTrackerModel from '../../src/modules/fitness-tracker/fitnessTrackerModel.js'

let mongoServer
let user
let otherUser
let token
let otherToken

beforeAll(async () => {
    // prepare test database
  mongoServer = await MongoMemoryServer.create()

  await mongoose.connect(mongoServer.getUri())
  await fitnessTrackerModel.syncIndexes()

  // create test user (bcz after request -> requireAuth)
  // if no user -> request fails
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

  // create a token
  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
  otherToken = jwt.sign({ id: otherUser._id }, env.JWT_SECRET)
})

afterEach(async () => {
  await fitnessTrackerModel.deleteMany({})
})

afterAll(async () => {
  await profileModel.deleteMany({})
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('Fitness Tracker Integration Tests', () => {

    // test 1 (API 1)
  test('POST /activities should create a workout activity for logged-in user', async () => {

    // send request
    const response = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({// must match schema
        id: 'activity-1',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        calories: 200,
        date: '2026-06-09',
        notes: 'Morning run',
      })

      // verify with database
    expect(response.status).toBe(201)
    expect(response.body.id).toBe('activity-1')
    expect(response.body.userId).toBeUndefined()
    expect(response.body._id).toBeUndefined()

    const savedActivity = await fitnessTrackerModel.findOne({
      userId: user._id,
      id: 'activity-1',
    }).lean()

    expect(savedActivity).not.toBeNull()
    expect(savedActivity.activity).toBe('Running')
    expect(savedActivity.type).toBe('workout')
    expect(savedActivity.calories).toBe(200)
    expect(String(savedActivity.userId)).toBe(String(user._id))
  })

  // test 2 (API 1) - can create steps
  test('POST /activities should create a steps activity and persist it', async () => {
    const response = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: 'steps-1',
        type: 'steps',
        steps: 8000,
        calories: 180,
        date: '2026-06-09',
      })

    expect(response.status).toBe(201)
    expect(response.body.type).toBe('steps')
    expect(response.body.steps).toBe(8000)

    const savedActivity = await fitnessTrackerModel.findOne({
      userId: user._id,
      id: 'steps-1',
    }).lean()

    expect(savedActivity).not.toBeNull()
    expect(savedActivity.steps).toBe(8000)
    expect(savedActivity.type).toBe('steps')
  })

  // test 3 (API 1) - reject no token
  test('POST /activities should reject request without token', async () => {
    const response = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .send({
        id: 'activity-1',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        calories: 200,
        date: '2026-06-09',
      })

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Unauthorized')

    const savedActivity = await fitnessTrackerModel.findOne({ id: 'activity-1' }).lean()
    expect(savedActivity).toBeNull()
  })

  // test 4 (API 1) - reject invalid data
  test('POST /activities should reject invalid payload and keep database unchanged', async () => {
    const response = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: '',
        type: 'workout',
        calories: -10,
        date: '2026-06-09',
      })

    expect(response.status).toBe(400)

    const count = await fitnessTrackerModel.countDocuments({})
    expect(count).toBe(0)
  })

  test('POST /activities should block duplicate steps for the same user and date', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'steps-1',
      type: 'steps',
      steps: 5000,
      calories: 100,
      date: '2026-06-09',
    })

    const response = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: 'steps-2',
        type: 'steps',
        steps: 7000,
        calories: 150,
        date: '2026-06-09',
      })

    expect(response.status).toBe(409)
    expect(response.body.title).toBe('Duplicate steps activity')

    const activities = await fitnessTrackerModel.find({
      userId: user._id,
      date: '2026-06-09',
      type: 'steps',
    }).lean()

    expect(activities).toHaveLength(1)
    expect(activities[0].id).toBe('steps-1')
  })

  test('POST /activities should allow same date steps for another user', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'steps-1',
      type: 'steps',
      steps: 5000,
      calories: 100,
      date: '2026-06-09',
    })

    const response = await request(app)
      .post('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        id: 'steps-1',
        type: 'steps',
        steps: 7000,
        calories: 150,
        date: '2026-06-09',
      })

    expect(response.status).toBe(201)

    const otherUserActivity = await fitnessTrackerModel.findOne({
      userId: otherUser._id,
      id: 'steps-1',
    }).lean()

    expect(otherUserActivity).not.toBeNull()
    expect(otherUserActivity.steps).toBe(7000)
  })

  // test 1 (API 2)
  test('GET /activities should return only logged-in user records', async () => {
    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'my-workout',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        calories: 250,
        date: '2026-06-09',
      },
      {
        userId: otherUser._id,
        id: 'other-workout',
        type: 'workout',
        activity: 'Cycling',
        duration: 45,
        calories: 300,
        date: '2026-06-09',
      },
    ])

    const response = await request(app)
      .get('/api/v1/fitness-tracker/activities')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.activities).toHaveLength(1)
    expect(response.body.activities[0].id).toBe('my-workout')
  })

  test('GET /activities should reject unauthenticated request', async () => {
    const response = await request(app).get('/api/v1/fitness-tracker/activities')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Unauthorized')
  })

  test('GET /api/v1/fitness-tracker should return overview based on persisted records', async () => {
    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'workout-1',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        calories: 250,
        date: '2026-06-09',
      },
      {
        userId: user._id,
        id: 'steps-1',
        type: 'steps',
        steps: 8000,
        duration: 10,
        calories: 100,
        date: '2026-06-10',
      },
    ])

    const response = await request(app)
      .get('/api/v1/fitness-tracker')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.totalCalories).toBe(350)
    expect(response.body.weeklyGoal.completedMinutes).toBe(40)
    expect(response.body.weeklyGoal.workoutsCompleted).toBe(1)
    expect(response.body.goalProgressPercent).toBe(13)
    expect(response.body.activities).toHaveLength(2)
  })

  test('GET /api/v1/fitness-tracker should reject unauthenticated request', async () => {
    const response = await request(app).get('/api/v1/fitness-tracker')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Unauthorized')
  })

  test('DELETE /activities/:id should delete only the logged-in user activity', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'delete-me',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    const response = await request(app)
      .delete('/api/v1/fitness-tracker/activities/delete-me')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Activity deleted successfully')

    const deletedActivity = await fitnessTrackerModel.findOne({
      userId: user._id,
      id: 'delete-me',
    }).lean()

    expect(deletedActivity).toBeNull()
  })

  test('DELETE /activities/:id should not delete another user activity', async () => {
    await fitnessTrackerModel.create({
      userId: otherUser._id,
      id: 'other-activity',
      type: 'workout',
      activity: 'Cycling',
      duration: 45,
      calories: 300,
      date: '2026-06-09',
    })

    const response = await request(app)
      .delete('/api/v1/fitness-tracker/activities/other-activity')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Activity not found')

    const otherUserActivity = await fitnessTrackerModel.findOne({
      userId: otherUser._id,
      id: 'other-activity',
    }).lean()

    expect(otherUserActivity).not.toBeNull()
  })

  test('DELETE /activities/:id should reject unauthenticated request', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'delete-me',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    const response = await request(app)
      .delete('/api/v1/fitness-tracker/activities/delete-me')

    expect(response.status).toBe(401)

    const savedActivity = await fitnessTrackerModel.findOne({
      userId: user._id,
      id: 'delete-me',
    }).lean()

    expect(savedActivity).not.toBeNull()
  })

  test('DELETE /activities/:id should return 404 when record does not exist', async () => {
    const response = await request(app)
      .delete('/api/v1/fitness-tracker/activities/missing-id')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Activity not found')
  })
})
