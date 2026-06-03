// Model = database structure for a single day's meal plan.
// The frontend stores this under `np_todayPlan_<date>` as three slot arrays.
import mongoose from 'mongoose'

// Each item inside a slot. _id: false because these are plain embedded items,
// not their own documents — we don't need a Mongo id per meal in the plan.
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
    // One plan document per date, e.g. '2026-06-04'
    date: {
      type: String,
      required: true,
      unique: true, // single-user for now. With auth: drop this, use a compound
                    // index { userId: 1, date: 1 } unique instead.
    },
    breakfast: { type: [planItemSchema], default: [] },
    lunch: { type: [planItemSchema], default: [] },
    dinner: { type: [planItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('NutritionMealPlan', mealPlanSchema)
