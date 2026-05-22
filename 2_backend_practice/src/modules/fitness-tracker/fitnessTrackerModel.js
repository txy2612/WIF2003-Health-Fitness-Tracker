//Model = database structure for fitness activities 
import mongoose from 'mongoose'

// mongoose.Schema = Define document/database structure
const fitnessTrackerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['workout', 'steps'],
      required: true,
    },

    activity: {
      type: String,// must be String
      trim: true,
    },

    duration: {
      type: Number,
      min: 0,
      default: 0,
    },

    steps: {
      type: Number,
      min: 0,
      default: 0,
    },

    calories: {
      type: Number,
      min: 0,
      default: 0,
    },

    date: {
      type: String,
      required: true,
    },

    notes: {
      type: String,
      default: '',
    },

    loggedAt: {
      type: Date,
      default: Date.now,//if frontend did not send it, at backend MongoDB autogenerates current date
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('TestFitnessActivity', fitnessTrackerSchema)
