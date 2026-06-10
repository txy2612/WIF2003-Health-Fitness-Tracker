// Model = database structure for a single day's meal plan.
import mongoose from 'mongoose'

// Each item inside a slot. _id: false because these are plain embedded items.
const planItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // frontend meal id
    name: { type: String, required: true },
    calories: { type: Number, required: true, min: 0 },
    img: { type: String, default: '' },
  },
  { _id: false }
)

const mealPlanSchema = new mongoose.Schema(
  {
    // Owner of this plan. Set from the logged-in user (requireAuth).
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profiles',
      required: true,
      index: true,
    },
    // One plan document per user per date, e.g. '2026-06-04'
    date: {
      type: String,
      required: true,
    },
    breakfast: { type: [planItemSchema], default: [] },
    lunch: { type: [planItemSchema], default: [] },
    dinner: { type: [planItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
)

// One plan per user per day (User A and User B can each have a plan for the
// same date).
mealPlanSchema.index({ userId: 1, date: 1 }, { unique: true })

export default mongoose.model('NutritionMealPlan', mealPlanSchema)
