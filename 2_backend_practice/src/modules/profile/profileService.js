import profileModel from './profileModel.js'

async function getProfileOverview() {
  const profile = await profileModel.findOne({}).sort({ createdAt: -1 }).lean()

  return buildProfileOverview(profile)
}

async function updateProfilePreview(profile) {
  const currentProfile = await profileModel.findOne({}).sort({ createdAt: -1 }).lean()

  return buildProfileOverview({
    ...currentProfile,
    displayName: profile.displayName,
    goal: profile.goal,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: profile.activityLevel,
  })
}

function buildProfileOverview(profile = {}) {
  return {
    generatedAt: new Date().toISOString(),
    user: {
      id: profile._id,
      displayName: profile.displayName,
      email: profile.email,
      timezone: profile.timezone,
      goal: profile.goal,
    },
    healthProfile: {
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel,
    },
  }
}

export default {
  getProfileOverview,
  updateProfilePreview,
}
