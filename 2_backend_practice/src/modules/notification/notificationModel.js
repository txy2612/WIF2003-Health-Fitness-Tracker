import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ['workout', 'nutrition', 'hydration', 'progress', 'system', 'other'],
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
  completed: {
    type: Boolean,
    default: false,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
  emailSentAt: {
    type: Date,
    default: null,
  },
  emailSendLockedAt: {
    type: Date,
    default: null,
  },
  sendAttempts: {
    type: Number,
    min: 0,
    default: 0,
  },
  lastSendError: {
    type: String,
    trim: true,
    default: null,
  },
}, {
  timestamps: true,
})

// .index() = indexing for fast lookup
// scheduledFor > completedAt > sentAt
/* etc:
  scheduledFor
 ├─ completed=false
 │   ├─ emailSentAt=null
*/
// 1 = ascending order
/*etc:
{ scheduledFor: 09:00 },
  { scheduledFor: 09:01 },
  { scheduledFor: 09:02 },
*/
notificationSchema.index({ scheduledFor: 1, completed: 1, emailSentAt: 1, emailSendLockedAt: 1 })

// Schema defines structure of data
// Model is created from Schema and is what mongoose use to interact w MongoDB
// Methods like .fimd(), .create(), .deleteOne() belong to the Model , not schema
const notificationModel = mongoose.model('Notification', notificationSchema)

export default notificationModel
