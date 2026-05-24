import mongoose from 'mongoose'

const profileSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  timezone: {
    type: String,
    required: true,
    trim: true,
  },
  goal: {
    type: String,
    required: true,
    trim: true,
  },
  heightCm: {
    type: Number,
    min: 1,
  },
  weightKg: {
    type: Number,
    min: 1,
  },
  activityLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    default: 'moderate',
  },
}, {
  timestamps: true,
})

const profileModel = mongoose.model('Profile', profileSchema)

export default profileModel
