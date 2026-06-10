import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import dashboardService from '../../src/modules/dashboard/dashboardService.js'
import profileModel from '../../src/modules/profile/profileModel.js'
import fitnessTrackerModel from '../../src/modules/fitness-tracker/fitnessTrackerModel.js'
import progressChartsModel from '../../src/modules/progress-charts/progressChartsModel.js'

let mongoServer
let user
let otherUser

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return toDateStr(new Date())
}

function dateStrDaysAgo(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return toDateStr(d)
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
  })

  otherUser = await profileModel.create({
    name: 'Other User',
    email: 'other@example.com',
    password: 'hashedpassword',
  })
})

describe('Dashboard Unit Tests', () => {
  test('returns default goals if profile has no custom goals', async () => {
    const dashboard = await dashboardService.getDashboardOverview(user._id)

    expect(dashboard.goals).toEqual({
      steps: 10000,
      calories: 2000,
      water: 8,
    })
  })

  test('returns custom goals from profile', async () => {
    await profileModel.findByIdAndUpdate(user._id, {
      goals: {
        steps: 12000,
        calories: 2500,
        water: 10,
      },
    })

    const dashboard = await dashboardService.getDashboardOverview(user._id)

    expect(dashboard.goals.steps).toBe(12000)
    expect(dashboard.goals.calories).toBe(2500)
    expect(dashboard.goals.water).toBe(10)
  })

  test('calculates today steps, calories, and workouts', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'steps-today',
      type: 'steps',
      steps: 8000,
      calories: 100,
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

    const dashboard = await dashboardService.getDashboardOverview(user._id)

    expect(dashboard.today.steps).toBe(8000)
    expect(dashboard.today.calories).toBe(350)
    expect(dashboard.today.workouts).toBe(1)
  })

  test('includes today water from progress chart entry', async () => {
    await progressChartsModel.create({
      userId: user._id,
      metric: 'waterGlasses',
      recordedFor: startOfToday(),
      value: 6,
    })

    const dashboard = await dashboardService.getDashboardOverview(user._id)

    expect(dashboard.today.water).toBe(6)
  })

  test('counts only current user data in dashboard', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'my-steps',
      type: 'steps',
      steps: 8000,
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

    const dashboard = await dashboardService.getDashboardOverview(user._id)

    expect(dashboard.today.steps).toBe(8000)
    expect(dashboard.today.calories).toBe(100)
  })

  test('calculates workout streak', async () => {
    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-today',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: dateStrDaysAgo(0),
    })

    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-yesterday',
      type: 'workout',
      activity: 'Cycling',
      duration: 30,
      calories: 200,
      date: dateStrDaysAgo(1),
    })

    await fitnessTrackerModel.create({
      userId: user._id,
      id: 'workout-2-days-ago',
      type: 'workout',
      activity: 'Walking',
      duration: 30,
      calories: 150,
      date: dateStrDaysAgo(2),
    })

    const dashboard = await dashboardService.getDashboardOverview(user._id)

    expect(dashboard.weekly.streak).toBe(3)
  })
})