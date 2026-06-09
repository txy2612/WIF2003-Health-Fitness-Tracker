import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../../src/app.js'
import env from '../../src/config/env.js'
import profileModel from '../../src/modules/profile/profileModel.js'
import fitnessTrackerModel from '../../src/modules/fitness-tracker/fitnessTrackerModel.js'
import progressChartsModel from '../../src/modules/progress-charts/progressChartsModel.js'

let mongoServer
let user
let otherUser
let token

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return toDateStr(new Date())
}

function startOfToday() {
  return new Date(`${todayStr()}T00:00:00.000`)
}

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
  await fitnessTrackerModel.deleteMany({})
  await progressChartsModel.deleteMany({})

  user = await profileModel.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    goals: {
      steps: 10000,
      calories: 2000,
      water: 8,
    },
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'hashedpassword',
  })

  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
})

describe('Dashboard Functional Tests', () => {
  test('GET /api/v1/dashboard without token returns 401', async () => {
    const res = await request(app).get('/api/v1/dashboard')

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Unauthorized')
  })

  test('GET /api/v1/dashboard with token returns 200 and dashboard structure', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.generatedAt).toBeDefined()
    expect(res.body.goals).toBeDefined()
    expect(res.body.today).toBeDefined()
    expect(res.body.weekly).toBeDefined()
  })

  test('dashboard returns today fitness summary', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'steps-today',
      type: 'steps',
      steps: 9000,
      calories: 120,
      date: todayStr(),
    })

    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-today',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: todayStr(),
    })

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.today.steps).toBe(9000)
    expect(res.body.today.calories).toBe(370)
    expect(res.body.today.workouts).toBe(1)
  })

  test('dashboard includes water progress', async () => {
    await progressChartsModel.create({
      userId: user._id,
      metric: 'waterGlasses',
      recordedFor: startOfToday(),
      value: 5,
    })

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.today.water).toBe(5)
  })

  test('dashboard only includes current user data', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'my-steps',
      type: 'steps',
      steps: 7000,
      calories: 100,
      date: todayStr(),
    })

    await fitnessTrackerModel.create({
      userId: otherUser._id,
      id: 'other-steps',
      type: 'steps',
      steps: 20000,
      calories: 999,
      date: todayStr(),
    })

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.today.steps).toBe(7000)
    expect(res.body.today.calories).toBe(100)
  })
})