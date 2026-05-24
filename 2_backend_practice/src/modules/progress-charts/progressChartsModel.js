import mongoose from 'mongoose'

const progressChartsSchema = new mongoose.Schema({
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

const progressChartsModel = mongoose.model('ProgressChartEntry', progressChartsSchema)

export default progressChartsModel
