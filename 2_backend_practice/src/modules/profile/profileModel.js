import mongoose from 'mongoose'

const profileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  photo: {
    type: String,
    default: null
  },

  age: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  weight: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  goal: {
    type: String,
    enum: ['lose', 'maintain', 'gain', null],
    default: null
  },
  goals: {
    steps: {
      type: Number,
      default: null
    },
    calories: {
      type: Number,
      default: null
    },
    weight: {
      type: Number,
      default: null
    }
  }
}, { timestamps: true });

const profileModel = mongoose.model('Profiles', profileSchema)

export default profileModel
