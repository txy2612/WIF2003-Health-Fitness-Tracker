import bcrypt from 'bcrypt'
import profileModel from './profileModel.js'

async function getProfileOverview(userId) {
  const profile = await profileModel.findById(userId).lean()

  if (!profile) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return buildProfileOverview(profile)
}

async function updateProfileOverview(userId, updateData) {
  const updatedProfile = await profileModel
    .findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    )
    .lean()

  if (!updatedProfile) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return buildProfileOverview(updatedProfile)
}

async function updateGoals(userId, goalsData) {
  const user = await profileModel
    .findByIdAndUpdate(
      userId,
      { $set: { goals: goalsData } },
      { returnDocument: 'after', runValidators: true }
    )
    .lean()

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return buildGoals(user.goals)
}

async function clearGoals(userId) {
  const emptyGoals = {
    steps: null,
    calories: null,
    weight: null,
    water: null,
  }

  const user = await profileModel
    .findByIdAndUpdate(
      userId,
      { $set: { goals: emptyGoals } },
      { returnDocument: 'after', runValidators: true }
    )
    .lean()

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return buildGoals(user.goals)
}

async function uploadPhoto(userId, file) {
  if (!file) {
    const error = new Error('No photo file uploaded')
    error.statusCode = 400
    throw error
  }

  const user = await profileModel
    .findByIdAndUpdate(
      userId,
      { $set: { photo: file.path } },
      { returnDocument: 'after', select: 'photo -_id' }
    )
    .lean()

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return user
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await profileModel.findById(userId)

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) {
    const error = new Error('Current password is incorrect')
    error.statusCode = 401
    throw error
  }

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()

  return {
    success: true,
    message: 'Password changed successfully',
  }
}

async function deleteProfile(userId) {
  const user = await profileModel.findByIdAndDelete(userId)

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return {
    success: true,
    message: 'Profile deleted successfully',
  }
}

function buildGoals(goals = {}) {
  return {
    steps: goals.steps ?? 10000,
    calories: goals.calories ?? 2000,
    weight: goals.weight ?? null,
    water: goals.water ?? 8,
  }
}

function buildProfileOverview(profile) {
  const goals = buildGoals(profile.goals)

  return {
    generatedAt: new Date().toISOString(),
    user: {
      id: profile._id,
      name: profile.name,
      displayName: profile.name,
      email: profile.email,
      timezone: profile.timezone || 'Asia/Kuala_Lumpur',
      goal: profile.goal,
      gender: profile.gender,
      photo: profile.photo,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
    },
    healthProfile: {
      heightCm: profile.height,
      weightKg: profile.weight,
      activityLevel: profile.activityLevel || 'moderate',
    },
    goals,
  }
}

export default {
  getProfileOverview,
  updateProfileOverview,
  updateGoals,
  clearGoals,
  uploadPhoto,
  changePassword,
  deleteProfile,
}
