import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import fitnessTrackerService from '../../src/modules/fitness-tracker/fitnessTrackerService.js'
import fitnessTrackerModel from '../../src/modules/fitness-tracker/fitnessTrackerModel.js'

let mongoServer
let userId

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
  await fitnessTrackerModel.deleteMany({})
  userId = new mongoose.Types.ObjectId()
})

describe('Fitness Tracker Unit Tests', () => {
  test('createActivity saves workout and removes MongoDB internal fields', async () => {
    const activity = await fitnessTrackerService.createActivity(userId, {
      id: 'workout-1',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    expect(activity.id).toBe('workout-1')
    expect(activity.type).toBe('workout')
    expect(activity._id).toBeUndefined()
    expect(activity.__v).toBeUndefined()
    expect(activity.userId).toBeUndefined()
  })

  test('createActivity blocks duplicate steps for same user and same date', async () => {
    await fitnessTrackerService.createActivity(userId, {
      id: 'steps-1',
      type: 'steps',
      steps: 5000,
      calories: 100,
      date: '2026-06-09',
    })

    await expect(
      fitnessTrackerService.createActivity(userId, {
        id: 'steps-2',
        type: 'steps',
        steps: 7000,
        calories: 150,
        date: '2026-06-09',
      })
    ).rejects.toMatchObject({
      status: 409,
      title: 'Duplicate steps activity',
    })
  })

  test('createActivity allows multiple workouts on same date', async () => {
    await fitnessTrackerService.createActivity(userId, {
      id: 'workout-1',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    const secondWorkout = await fitnessTrackerService.createActivity(userId, {
      id: 'workout-2',
      type: 'workout',
      activity: 'Cycling',
      duration: 45,
      calories: 300,
      date: '2026-06-09',
    })

    expect(secondWorkout.id).toBe('workout-2')
  })

  test('getActivities returns only activities for one user', async () => {
    const otherUserId = new mongoose.Types.ObjectId()

    await fitnessTrackerModel.create({
      userId,
      id: 'mine',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    await fitnessTrackerModel.create({
      userId: otherUserId,
      id: 'not-mine',
      type: 'workout',
      activity: 'Cycling',
      duration: 40,
      calories: 280,
      date: '2026-06-09',
    })

    const result = await fitnessTrackerService.getActivities(userId)

    expect(result.activities).toHaveLength(1)
    expect(result.activities[0].id).toBe('mine')
  })

  test('getFitnessTrackerOverview calculates total calories and completed minutes', async () => {
    await fitnessTrackerModel.create({
      userId,
      id: 'workout-1',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    await fitnessTrackerModel.create({
      userId,
      id: 'steps-1',
      type: 'steps',
      steps: 8000,
      duration: 10,
      calories: 100,
      date: '2026-06-10',
    })

    const overview = await fitnessTrackerService.getFitnessTrackerOverview(userId)

    expect(overview.totalCalories).toBe(350)
    expect(overview.weeklyGoal.completedMinutes).toBe(40)
    expect(overview.weeklyGoal.workoutsCompleted).toBe(1)
    expect(overview.goalProgressPercent).toBe(13)
  })

  test('deleteActivity returns deleted activity if found', async () => {
    await fitnessTrackerModel.create({
      userId,
      id: 'delete-me',
      type: 'workout',
      activity: 'Running',
      duration: 30,
      calories: 250,
      date: '2026-06-09',
    })

    const deleted = await fitnessTrackerService.deleteActivity(userId, 'delete-me')

    expect(deleted.id).toBe('delete-me')
  })

  test('deleteActivity returns null if activity does not exist', async () => {
    const deleted = await fitnessTrackerService.deleteActivity(userId, 'missing-id')

    expect(deleted).toBeNull()
  })
})