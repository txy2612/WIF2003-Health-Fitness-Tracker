import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import profileService from '../../src/modules/profile/profileService.js'
import profileModel from '../../src/modules/profile/profileModel.js'

let mongoServer

async function createProfile(overrides = {}) {
  const password = overrides.password || await bcrypt.hash('CurrentPassword123!', 10)

  return profileModel.create({
    name: 'Profile User',
    email: 'profile-user@example.com',
    password,
    age: 28,
    height: 170,
    weight: 68,
    gender: 'male',
    goal: 'fitness',
    timezone: 'Asia/Kuala_Lumpur',
    activityLevel: 'moderate',
    ...overrides,
  })
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  await profileModel.syncIndexes()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await profileModel.deleteMany({})
})

describe('Profile Unit Tests', () => {
  test('getProfileOverview returns mapped profile data with default goals', async () => {
    const user = await createProfile({
      goals: {
        steps: null,
        calories: null,
        weight: null,
        water: null,
      },
    })

    const overview = await profileService.getProfileOverview(user._id)

    expect(typeof overview.generatedAt).toBe('string')
    expect(String(overview.user.id)).toBe(String(user._id))
    expect(overview.user.email).toBe('profile-user@example.com')
    expect(overview.healthProfile.heightCm).toBe(170)
    expect(overview.healthProfile.weightKg).toBe(68)
    expect(overview.goals).toEqual({
      steps: 10000,
      calories: 2000,
      weight: null,
      water: 8,
    })
  })

  test('updateProfileOverview persists the updated fields', async () => {
    const user = await createProfile()

    const updated = await profileService.updateProfileOverview(user._id, {
      name: 'Updated Name',
      weight: 72,
      goal: 'endurance',
      activityLevel: 'high',
    })

    expect(updated.user.name).toBe('Updated Name')
    expect(updated.user.weight).toBe(72)
    expect(updated.user.goal).toBe('endurance')
    expect(updated.healthProfile.activityLevel).toBe('high')

    const savedUser = await profileModel.findById(user._id).lean()
    expect(savedUser.name).toBe('Updated Name')
    expect(savedUser.weight).toBe(72)
    expect(savedUser.goal).toBe('endurance')
  })

  test('updateGoals saves custom goals and returns the normalized goal payload', async () => {
    const user = await createProfile()

    const goals = await profileService.updateGoals(user._id, {
      steps: 12000,
      calories: 2300,
      weight: 65,
      water: 10,
    })

    expect(goals).toEqual({
      steps: 12000,
      calories: 2300,
      weight: 65,
      water: 10,
    })

    const savedUser = await profileModel.findById(user._id).lean()
    expect(savedUser.goals).toEqual({
      steps: 12000,
      calories: 2300,
      weight: 65,
      water: 10,
    })
  })

  test('clearGoals resets goals back to defaults', async () => {
    const user = await createProfile({
      goals: {
        steps: 9000,
        calories: 1800,
        weight: 64,
        water: 6,
      },
    })

    const goals = await profileService.clearGoals(user._id)

    expect(goals).toEqual({
      steps: 10000,
      calories: 2000,
      weight: null,
      water: 8,
    })

    const savedUser = await profileModel.findById(user._id).lean()
    expect(savedUser.goals).toEqual({
      steps: null,
      calories: null,
      weight: null,
      water: null,
    })
  })

  test('uploadPhoto rejects missing files', async () => {
    const user = await createProfile()

    await expect(profileService.uploadPhoto(user._id, null)).rejects.toMatchObject({
      message: 'No photo file uploaded',
      statusCode: 400,
    })
  })

  test('uploadPhoto saves the file path on the profile', async () => {
    const user = await createProfile()

    const result = await profileService.uploadPhoto(user._id, {
      path: 'uploads/profile-photo.jpg',
    })

    expect(result).toEqual({ photo: 'uploads/profile-photo.jpg' })

    const savedUser = await profileModel.findById(user._id).lean()
    expect(savedUser.photo).toBe('uploads/profile-photo.jpg')
  })

  test('changePassword replaces the stored password hash', async () => {
    const user = await createProfile()

    const result = await profileService.changePassword(
      user._id,
      'CurrentPassword123!',
      'NewPassword456!'
    )

    expect(result).toEqual({
      success: true,
      message: 'Password changed successfully',
    })

    const savedUser = await profileModel.findById(user._id)
    expect(await bcrypt.compare('NewPassword456!', savedUser.password)).toBe(true)
    expect(await bcrypt.compare('CurrentPassword123!', savedUser.password)).toBe(false)
  })

  test('changePassword rejects an invalid current password', async () => {
    const user = await createProfile()

    await expect(
      profileService.changePassword(user._id, 'WrongPassword!', 'NewPassword456!')
    ).rejects.toMatchObject({
      message: 'Current password is incorrect',
      statusCode: 401,
    })
  })

  test('deleteProfile removes the user profile', async () => {
    const user = await createProfile()

    const result = await profileService.deleteProfile(user._id)

    expect(result).toEqual({
      success: true,
      message: 'Profile deleted successfully',
    })

    const deletedUser = await profileModel.findById(user._id).lean()
    expect(deletedUser).toBeNull()
  })
})
