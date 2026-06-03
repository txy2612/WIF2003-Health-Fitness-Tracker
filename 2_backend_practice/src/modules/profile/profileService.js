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

async function updateProfile(profile) {
  const currentProfile = await profileModel.findOne({}).sort({ createdAt: -1 }).lean()

  const savedProfile = currentProfile
    ? await profileModel.findByIdAndUpdate(currentProfile._id, profile, { new: true }).lean()
    : await profileModel.create(profile)

  return buildProfileOverview(savedProfile)
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
  updateProfile,
  updateProfilePreview,
}
