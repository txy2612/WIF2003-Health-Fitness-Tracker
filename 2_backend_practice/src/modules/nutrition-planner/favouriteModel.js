// Model = database structure for a user's favourite meals.
// Mirrors the fitness-tracker model style: timestamps, a frontend-supplied id.
import mongoose from 'mongoose'

const favouriteSchema = new mongoose.Schema(
  {
    // mealId = the frontend meal id, e.g. 'grilled-chicken-breast'
    // (separate from MongoDB's own _id, same idea as fitness-tracker's `id`)
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

// One favourite per meal. Single-user for now (matches fitness-tracker, which is
// also global until auth lands). When Fariq's auth merges, add `userId` to the
// schema and change this to: { userId: 1, mealId: 1 }
favouriteSchema.index({ mealId: 1 }, { unique: true })

export default mongoose.model('NutritionFavourite', favouriteSchema)
