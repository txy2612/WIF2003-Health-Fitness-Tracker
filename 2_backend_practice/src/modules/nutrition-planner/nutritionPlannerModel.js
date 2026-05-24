import mongoose from 'mongoose'

const nutritionPlannerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  calories: {
    type: Number,
    required: true,
    min: 0,
  },
  proteinGrams: {
    type: Number,
    required: true,
    min: 0,
  },
  carbsGrams: {
    type: Number,
    required: true,
    min: 0,
  },
  fatGrams: {
    type: Number,
    required: true,
    min: 0,
  },
  tags: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
})

const nutritionPlannerModel = mongoose.model('NutritionPlannerMeal', nutritionPlannerSchema)

export default nutritionPlannerModel
