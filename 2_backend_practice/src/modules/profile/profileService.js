import profileModel from './profileModel.js';
import bcrypt from 'bcryptjs';

async function getProfileOverview(userId) {
  const profile = await profileModel.findById(userId).lean();

  if (!profile) throw new Error('User not found');

  return buildProfileOverview(profile);
}

async function updateProfileOverview(userId, updateData) {
  const updatedProfile = await profileModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  ).lean();

  return buildProfileOverview(updatedProfile);
}

async function updateGoals(userId, goalsData) {
  const user = await profileModel.findByIdAndUpdate(
    userId,
    { $set: { goals: goalsData } },
    { returnDocument: 'after', runValidators: true }
  );

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user.goals;
}

async function clearGoals(userId) {

  const emptyGoals = {
    steps: null,
    calories: null,
    weight: null
  };

  const user = await profileModel.findByIdAndUpdate(
    userId,
    { $set: { goals: emptyGoals } },
    { returnDocument: 'after' }
  );

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user.goals;
}

function buildProfileOverview(profile) {
  return {
    user: {
      id: profile._id,
      name: profile.name,
      email: profile.email,
      goal: profile.goal,
      gender: profile.gender,
      photo: profile.photo,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
    },
    goals: profile.goals || { steps: null, calories: null, weight: null }
  };
}

function uploadPhoto(userId, file) {
  if (!file) {
    const error = new Error('No photo file uploaded');
    error.statusCode = 400;
    throw error;
  }

  const photoUrl = file.path;

  const user = profileModel.findByIdAndUpdate(
    userId,
    { $set: { photo: photoUrl } },
    { returnDocument: 'after', select: 'photo -_id' }
  );

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function changePassword(userId, currentPassword, newPassword) {

  const user = await profileModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  await user.save();

  return {
    success: true,
    message: 'Password changed successfully'
  };
}

async function deleteProfile(userId) {
  const user = await profileModel.findByIdAndDelete(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: 'Profile deleted successfully'
  };
}

export default {
  getProfileOverview,
  updateProfileOverview,
  updateGoals,
  clearGoals,
  uploadPhoto,
  changePassword,
  deleteProfile
};