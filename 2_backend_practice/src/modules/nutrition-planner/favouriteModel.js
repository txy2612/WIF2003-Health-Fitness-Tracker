// Model = database structure for a user's favourite meals.
import mongoose from 'mongoose'

const favouriteSchema = new mongoose.Schema(
  {
    // Owner of this favourite. Set from the logged-in user (requireAuth).
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profiles',
      required: true,
      index: true,
    },
    // mealId = the frontend meal id, e.g. 'grilled-chicken-breast'
    mealId: {
      type: String,
      required: true,
    },
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
    img: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// One favourite per meal PER USER. User A and User B can both favourite the
// same meal, but neither can favourite it twice.
favouriteSchema.index({ userId: 1, mealId: 1 }, { unique: true })

export default mongoose.model('NutritionFavourite', favouriteSchema)
