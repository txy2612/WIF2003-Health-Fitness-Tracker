import nutritionPlannerModel from './nutritionPlannerModel.js'
import favouriteModel from './favouriteModel.js'
import mealPlanModel from './mealPlanModel.js'

// Strip Mongo internals before returning to the frontend (same idea as
// fitness-tracker's formatActivity).
function formatDoc(doc) {
  const plain = doc?.toObject ? doc.toObject() : { ...doc }
  delete plain._id
  delete plain.__v
  return plain
}

// ── existing: catalogue + calorie calculator ─────────────────────────────────

async function getNutritionPlannerOverview(query = {}) {
  const meals = await findMeals(query.search)
  const plannedMeals = meals.slice(0, 3)

  return {
    generatedAt: new Date().toISOString(),
    meals,
    plan: {
      date: new Date().toISOString().slice(0, 10),
      plannedMeals,
      totalCalories: plannedMeals.reduce((sum, meal) => sum + meal.calories, 0),
    },
  }
}

function calculateCalorieGoal(profile) {
  const weight = Number(profile.weightKg)
  const height = Number(profile.heightCm)
  const age = Number(profile.age)
  const bmrBase = (10 * weight) + (6.25 * height) - (5 * age)
  const bmr = profile.gender === 'female' ? bmrBase - 161 : bmrBase + 5
  const maintenanceCalories = Math.round(bmr * profile.activityMultiplier)
  const goalAdjustment = getGoalAdjustment(profile.goal)
  const targetCalories = maintenanceCalories + goalAdjustment

  return {
    maintenanceCalories,
    targetCalories,
    proteinGrams: Math.round((targetCalories * 0.3) / 4),
    carbsGrams: Math.round((targetCalories * 0.45) / 4),
    fatGrams: Math.round((targetCalories * 0.25) / 9),
  }
}

async function findMeals(search) {
  if (!search) {
    return nutritionPlannerModel.find({}).sort({ name: 1 }).lean()
  }

  return nutritionPlannerModel.find({
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ],
  }).sort({ name: 1 }).lean()
}

function getGoalAdjustment(goal) {
  if (goal === 'lose') {
    return -500
  }

  if (goal === 'gain') {
    return 300
  }

  return 0
}

// ── favourites ────────────────────────────────────────────────────────────────

async function getFavourites() {
  const favourites = await favouriteModel.find({}).sort({ createdAt: -1 }).lean()
  return { favourites: favourites.map(formatDoc) }
}

async function addFavourite(body) {
  // Idempotent: if the meal is already favourited, just return it instead of
  // throwing a duplicate-key error (the frontend heart toggle only POSTs on add,
  // but this keeps refreshes / double-clicks safe).
  const existing = await favouriteModel.findOne({ mealId: body.mealId }).lean()
  if (existing) {
    return formatDoc(existing)
  }

  const created = await favouriteModel.create(body)
  return formatDoc(created)
}

async function removeFavourite(mealId) {
  const deleted = await favouriteModel.findOneAndDelete({ mealId })
  return deleted ? formatDoc(deleted) : null
}

// ── today's plan ──────────────────────────────────────────────────────────────

async function getPlan(date) {
  const plan = await mealPlanModel.findOne({ date }).lean()
  if (!plan) {
    // No plan saved for that day yet — return an empty shape the UI can render.
    return { date, breakfast: [], lunch: [], dinner: [] }
  }
  return formatDoc(plan)
}

async function savePlan(body) {
  const { date, breakfast = [], lunch = [], dinner = [] } = body

  // Upsert by date: one plan per day. Saving the whole plan in one PUT matches
  // how the page already persists it, and avoids per-item round-trips.
  const plan = await mealPlanModel.findOneAndUpdate(
    { date },
    { date, breakfast, lunch, dinner },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean()

  return formatDoc(plan)
}

export default {
  calculateCalorieGoal,
  getNutritionPlannerOverview,
  getFavourites,
  addFavourite,
  removeFavourite,
  getPlan,
  savePlan,
}
