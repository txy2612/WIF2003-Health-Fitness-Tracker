import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ['workout', 'nutrition', 'progress', 'system'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
})

// Schema defines structure of data
// Model is created from Schema and is what mongoose use to interact w MongoDB
// Methods like .fimd(), .create(), .deleteOne() belong to the Model , not schema
const notificationModel = mongoose.model('Notification', notificationSchema)

export default notificationModel
