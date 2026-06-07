import mongoose from 'mongoose'

const progressChartsSchema = new mongoose.Schema({
  // Owner of this entry. Set from the logged-in user (requireAuth).
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profiles',
    required: true,
    index: true,
  },
  metric: {
    type: String,
    enum: ['activeMinutes', 'calories', 'waterGlasses'],
    required: true,
  },
  recordedFor: {
    type: Date,
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
})

// One entry per user, per metric, per day — lets us upsert (e.g. update today's
// water count instead of inserting duplicates).
progressChartsSchema.index({ userId: 1, metric: 1, recordedFor: 1 }, { unique: true })

const progressChartsModel = mongoose.model('ProgressChartEntry', progressChartsSchema)

export default progressChartsModel
