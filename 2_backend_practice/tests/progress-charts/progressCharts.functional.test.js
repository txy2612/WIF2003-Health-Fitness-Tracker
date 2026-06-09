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
let otherToken

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysAgo(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  await progressChartsModel.syncIndexes()
  await fitnessTrackerModel.syncIndexes()
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
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'hashedpassword',
  })

  token = jwt.sign({ id: user._id }, env.JWT_SECRET)
  otherToken = jwt.sign({ id: otherUser._id }, env.JWT_SECRET)
})

describe('Progress Charts Functional Tests', () => {
  test('GET /api/v1/progress-charts without token returns 401', async () => {
    const res = await request(app).get('/api/v1/progress-charts')

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Unauthorized')
  })

  test('GET /api/v1/progress-charts returns derived overview plus stored water', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-today',
      type: 'workout',
      activity: 'Running',
      duration: 40,
      calories: 220,
      date: toDateStr(daysAgo(0)),
    })

    await progressChartsModel.create({
      userId: user._id,
      metric: 'waterGlasses',
      recordedFor: daysAgo(0),
      value: 7,
    })

    const res = await request(app)
      .get('/api/v1/progress-charts')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.range).toBe('last-7-days')
    expect(res.body.labels).toHaveLength(7)
    expect(res.body.series.activeMinutes.at(-1)).toBe(40)
    expect(res.body.series.calories.at(-1)).toBe(220)
    expect(res.body.series.waterGlasses.at(-1)).toBe(7)
  })

  test('POST and GET /water persist only the current user water entry', async () => {
    const today = toDateStr(daysAgo(0))

    const postRes = await request(app)
      .post('/api/v1/progress-charts/water')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today, glasses: 5 })

    expect(postRes.statusCode).toBe(200)
    expect(postRes.body).toEqual({ date: today, glasses: 5 })

    await request(app)
      .post('/api/v1/progress-charts/water')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ date: today, glasses: 9 })

    const getRes = await request(app)
      .get(`/api/v1/progress-charts/water?date=${today}`)
      .set('Authorization', `Bearer ${token}`)

    expect(getRes.statusCode).toBe(200)
    expect(getRes.body).toEqual({ date: today, glasses: 5 })
  })

  test('POST /water upserts instead of creating duplicate day entries', async () => {
    const today = toDateStr(daysAgo(0))

    await request(app)
      .post('/api/v1/progress-charts/water')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today, glasses: 3 })

    const res = await request(app)
      .post('/api/v1/progress-charts/water')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today, glasses: 8 })

    const records = await progressChartsModel.find({ userId: user._id, metric: 'waterGlasses' }).lean()

    expect(res.statusCode).toBe(200)
    expect(res.body.glasses).toBe(8)
    expect(records).toHaveLength(1)
    expect(records[0].value).toBe(8)
  })

  test('GET /range-preview respects the requested range and metric', async () => {
    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'steps-in-range',
        type: 'steps',
        steps: 8000,
        calories: 120,
        date: toDateStr(daysAgo(5)),
      },
      {
        userId: user._id,
        id: 'steps-out-of-range',
        type: 'steps',
        steps: 5000,
        calories: 95,
        date: toDateStr(daysAgo(31)),
      },
    ])

    const res = await request(app)
      .get('/api/v1/progress-charts/range-preview?range=last-30-days&metric=calories')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.range).toBe('last-30-days')
    expect(res.body.metric).toBe('calories')
    expect(res.body.labels).toHaveLength(30)
    expect(res.body.values).toHaveLength(30)
    expect(res.body.values.at(-6)).toBe(120)
    expect(res.body.values.includes(95)).toBe(false)
  })

  test('GET /weekly aggregates only the current user activity logs', async () => {
    const [monday] = currentWeekDates()

    await fitnessTrackerModel.create([
      {
        userId: user._id,
        id: 'user-steps',
        type: 'steps',
        steps: 9000,
        calories: 110,
        date: monday,
      },
      {
        userId: user._id,
        id: 'user-workout',
        type: 'workout',
        activity: 'Cycling',
        duration: 30,
        calories: 240,
        date: monday,
      },
      {
        userId: otherUser._id,
        id: 'other-workout',
        type: 'workout',
        activity: 'Running',
        duration: 90,
        calories: 700,
        date: monday,
      },
    ])

    const res = await request(app)
      .get('/api/v1/progress-charts/weekly?offset=0')
      .set('Authorization', `Bearer ${token}`)

    const mondayRow = res.body.rows.find((row) => row.date === monday)

    expect(res.statusCode).toBe(200)
    expect(res.body.dates).toHaveLength(7)
    expect(mondayRow.steps).toBe(9000)
    expect(mondayRow.calories).toBe(350)
    expect(mondayRow.duration).toBe(30)
    expect(mondayRow.workouts).toHaveLength(1)
    expect(mondayRow.workouts[0].activity).toBe('Cycling')
  })

  test('GET /monthly returns the current user rows for the month window', async () => {
    const targetDate = toDateStr(daysAgo(2))

    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'monthly-workout',
      type: 'workout',
      activity: 'Walking',
      duration: 25,
      calories: 130,
      date: targetDate,
    })

    const res = await request(app)
      .get('/api/v1/progress-charts/monthly?offset=0')
      .set('Authorization', `Bearer ${token}`)

    const targetRow = res.body.rows.find((row) => row.date === targetDate)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.dates)).toBe(true)
    expect(res.body.rows).toHaveLength(res.body.dates.length)
    expect(targetRow.duration).toBe(25)
    expect(targetRow.calories).toBe(130)
    expect(targetRow.workouts).toHaveLength(1)
    expect(targetRow.workouts[0].activity).toBe('Walking')
  })
})
