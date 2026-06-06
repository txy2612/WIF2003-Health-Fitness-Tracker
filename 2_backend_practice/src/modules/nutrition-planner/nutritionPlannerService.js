import nutritionPlannerModel from './nutritionPlannerModel.js'
import favouriteModel from './favouriteModel.js'
import mealPlanModel from './mealPlanModel.js'

// Strip Mongo internals (and userId) before returning to the frontend.
function formatDoc(doc) {
  const plain = doc?.toObject ? doc.toObject() : { ...doc }
  delete plain._id
  delete plain.__v
  delete plain.userId
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

// ── favourites (scoped to the logged-in user) ────────────────────────────────

async function getFavourites(userId) {
  const favourites = await favouriteModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .lean()
  return { favourites: favourites.map(formatDoc) }
}

async function addFavourite(userId, body) {
  // Idempotent: if this user already favourited the meal, return it.
  const existing = await favouriteModel
    .findOne({ userId, mealId: body.mealId })
    .lean()
  if (existing) {
    return formatDoc(existing)
  }

  const created = await favouriteModel.create({ ...body, userId })
  return formatDoc(created)
}

async function removeFavourite(userId, mealId) {
  // Match userId too, so a user can only delete their own favourite.
  const deleted = await favouriteModel.findOneAndDelete({ userId, mealId })
  return deleted ? formatDoc(deleted) : null
}

// ── today's plan (scoped to the logged-in user) ──────────────────────────────

async function getPlan(userId, date) {
  const plan = await mealPlanModel.findOne({ userId, date }).lean()
  if (!plan) {
    return { date, breakfast: [], lunch: [], dinner: [] }
  }
  return formatDoc(plan)
}

async function savePlan(userId, body) {
  const { date, breakfast = [], lunch = [], dinner = [] } = body

  // Upsert by (userId, date): one plan per user per day.
  const plan = await mealPlanModel.findOneAndUpdate(
    { userId, date },
    { userId, date, breakfast, lunch, dinner },
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