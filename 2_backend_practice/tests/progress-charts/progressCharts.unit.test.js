import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import fitnessTrackerModel from '../../src/modules/fitness-tracker/fitnessTrackerModel.js'
import progressChartsService from '../../src/modules/progress-charts/progressChartsService.js'
import progressChartsModel from '../../src/modules/progress-charts/progressChartsModel.js'

let mongoServer
let userId

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await fitnessTrackerModel.deleteMany({})
  await progressChartsModel.deleteMany({})
  userId = new mongoose.Types.ObjectId()
})

describe('Progress Charts Unit Tests', () => {
  test('overview is limited to the last 7 days and zero-fills missing dates', async () => {
    await fitnessTrackerModel.create([
      {
        userId,
        id: 'workout-1',
        type: 'workout',
        activity: 'Running',
        duration: 45,
        calories: 180,
        date: toDateStr(daysAgo(1)),
      },
    ])

    await progressChartsModel.create([
      {
        userId,
        metric: 'waterGlasses',
        recordedFor: daysAgo(0),
        value: 6,
      },
    ])

    const overview = await progressChartsService.getProgressChartsOverview(userId)

    expect(overview.range).toBe('last-7-days')
    expect(overview.labels).toHaveLength(7)
    expect(overview.labels.at(-1)).toBe(toDateStr(daysAgo(0)))
    expect(overview.series.activeMinutes).toHaveLength(7)
    expect(overview.series.calories).toHaveLength(7)
    expect(overview.series.waterGlasses).toHaveLength(7)
    expect(overview.series.activeMinutes.at(-2)).toBe(45)
    expect(overview.series.calories.at(-2)).toBe(180)
    expect(overview.series.waterGlasses.at(-1)).toBe(6)
    expect(overview.summary.averageCalories).toBe(26)
  })

  test('range preview respects the requested last-30-days window', async () => {
    await fitnessTrackerModel.create([
      {
        userId,
        id: 'steps-1',
        type: 'steps',
        steps: 7000,
        calories: 120,
        date: toDateStr(daysAgo(5)),
      },
      {
        userId,
        id: 'steps-old',
        type: 'steps',
        steps: 5000,
        calories: 90,
        date: toDateStr(daysAgo(31)),
      },
    ])

    await progressChartsModel.create([
      {
        userId,
        metric: 'waterGlasses',
        recordedFor: daysAgo(5),
        value: 8,
      },
      {
        userId,
        metric: 'waterGlasses',
        recordedFor: daysAgo(31),
        value: 4,
      },
    ])

    const caloriesPreview = await progressChartsService.createRangePreview(userId, {
      range: 'last-30-days',
      metric: 'calories',
    })

    expect(caloriesPreview.labels).toHaveLength(30)
    expect(caloriesPreview.values).toHaveLength(30)
    expect(caloriesPreview.values.at(-6)).toBe(120)
    expect(caloriesPreview.values.includes(90)).toBe(false)

    const waterPreview = await progressChartsService.createRangePreview(userId, {
      range: 'last-30-days',
      metric: 'waterGlasses',
    })

    expect(waterPreview.labels).toHaveLength(30)
    expect(waterPreview.values).toHaveLength(30)
    expect(waterPreview.values.at(-6)).toBe(8)
    expect(waterPreview.values.includes(4)).toBe(false)
  })

  test('getWaterByDate returns only the requested user water data', async () => {
    const otherUserId = new mongoose.Types.ObjectId()
    const today = toDateStr(daysAgo(0))
    const yesterday = toDateStr(daysAgo(1))

    await progressChartsModel.create([
      {
        userId,
        metric: 'waterGlasses',
        recordedFor: daysAgo(1),
        value: 7,
      },
      {
        userId: otherUserId,
        metric: 'waterGlasses',
        recordedFor: daysAgo(0),
        value: 10,
      },
    ])

    const waterByDate = await progressChartsService.getWaterByDate(userId, [yesterday, today])

    expect(waterByDate).toEqual({
      [yesterday]: 7,
    })
  })

  test('setWater upserts one entry per user per day', async () => {
    const today = toDateStr(daysAgo(0))

    await progressChartsService.setWater(userId, today, 4)
    await progressChartsService.setWater(userId, today, 9)

    const records = await progressChartsModel.find({ userId, metric: 'waterGlasses' }).lean()

    expect(records).toHaveLength(1)
    expect(records[0].value).toBe(9)
  })
})
