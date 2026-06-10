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

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return toDateStr(new Date())
}

function currentWeekDates() {
  const today = new Date()
  const day = today.getDay() === 0 ? 7 : today.getDay()
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(today.getDate() - (day - 1))

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return toDateStr(date)
  })
}

function daysAgo(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())

  user = await profileModel.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    goals: {
      steps: 10000,
      calories: 2200,
      water: 8,
    },
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'password123',
  })

  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
})

afterEach(async () => {
  await fitnessTrackerModel.deleteMany({})
  await progressChartsModel.deleteMany({})
})

afterAll(async () => {
  await profileModel.deleteMany({})
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('Dashboard Integration Tests', () => {
  test('GET /api/v1/dashboard should require auth', async () => {
    const response = await request(app).get('/api/v1/dashboard')

    expect(response.status).toBe(401)
    expect(response.body.message).toBe('Unauthorized')
  })

  test('GET /api/v1/dashboard should return expected structure for logged-in user', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.generatedAt).toBeDefined()
    expect(response.body.goals).toBeDefined()
    expect(response.body.today).toBeDefined()
    expect(response.body.weekly).toBeDefined()
  })

  test('GET /api/v1/dashboard should combine profile goals, fitness logs, and water', async () => {
    const today = todayStr()
    const startOfToday = new Date(`${today}T00:00:00.000`)

    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'steps-today',
        type: 'steps',
        steps: 9000,
        calories: 120,
        date: today,
      },
      {
        userId: user._id,
        id: 'workout-today',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        calories: 250,
        date: today,
      },
    ])

    await progressChartsModel.create({
      userId: user._id,
      metric: 'waterGlasses',
      recordedFor: startOfToday,
      value: 5,
    })

    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.goals.steps).toBe(10000)
    expect(response.body.goals.calories).toBe(2200)
    expect(response.body.goals.water).toBe(8)
    expect(response.body.today.steps).toBe(9000)
    expect(response.body.today.calories).toBe(370)
    expect(response.body.today.workouts).toBe(1)
    expect(response.body.today.water).toBe(5)
    expect(response.body.today.healthScore).toBeGreaterThan(0)
  })

  test('GET /api/v1/dashboard should keep user data isolated', async () => {
    const today = todayStr()

    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'my-steps',
        type: 'steps',
        steps: 7000,
        calories: 100,
        date: today,
      },
      {
        userId: otherUser._id,
        id: 'other-steps',
        type: 'steps',
        steps: 20000,
        calories: 999,
        date: today,
      },
    ])

    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.today.steps).toBe(7000)
    expect(response.body.today.calories).toBe(100)
  })

  test('GET /api/v1/dashboard should calculate streak and weekly sessions from workouts', async () => {
    const [firstDate, secondDate, thirdDate] = currentWeekDates()

    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'workout-1',
        type: 'workout',
        activity: 'Running',
        duration: 30,
        calories: 250,
        date: firstDate,
      },
      {
        userId: user._id,
        id: 'workout-2',
        type: 'workout',
        activity: 'Cycling',
        duration: 40,
        calories: 300,
        date: secondDate,
      },
      {
        userId: user._id,
        id: 'workout-3',
        type: 'workout',
        activity: 'Walking',
        duration: 20,
        calories: 120,
        date: thirdDate,
      },
    ])

    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.weekly.sessions).toBe(3)
    expect(response.body.weekly.trend).toHaveLength(7)
  })
})
