import nutritionPlannerModel from './nutritionPlannerModel.js'

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

export default {
  calculateCalorieGoal,
  getNutritionPlannerOverview,
}
