//Model = database structure for fitness activities 
import mongoose from 'mongoose'

// mongoose.Schema = Define document/database structure
const fitnessTrackerSchema = new mongoose.Schema(
  {// added userId to separate users
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profiles',
      required: true,
      index: true,// keep query faster
    },

    id: {
      type: String,
      required: true,
      // removed unique: true
      // so id is no longer unique in the entire db
    },
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

// userId must be unique
// Business rule 1: a user(userId) cannot have record of same frontend id(id)
fitnessTrackerSchema.index(
  {userId:1, id:1},
  { unique: true }
)

// added userId, so thee wont be duplicated key for ( type + date )
// Business rule 2: no two 'steps records' on same date for one user
fitnessTrackerSchema.index(
  { userId:1 , type: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'steps' },
  }
)

export default mongoose.model('FitnessActivity', fitnessTrackerSchema)
