import fitnessTrackerModel from '../fitness-tracker/fitnessTrackerModel.js'

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

export async function getDashboardOverview() {
  const today = getTodayDate()

  const activities = await fitnessTrackerModel.find({}).lean()

  const todayLogs = activities.filter(activity => activity.date === today)

  const todaySteps = todayLogs
    .filter(activity => activity.type === 'steps')
    .reduce((sum, activity) => sum + (activity.steps || 0), 0)

  const todayCalories = todayLogs
    .reduce((sum, activity) => sum + (activity.calories || 0), 0)

  const todayWorkouts = todayLogs
    .filter(activity => activity.type === 'workout')

  const weeklySessions = activities
    .filter(activity => activity.type === 'workout')
    .length

  return {
    generatedAt: new Date().toISOString(),
    today: {
      steps: todaySteps,
      calories: todayCalories,
      workouts: todayWorkouts.length,
    },
    weekly: {
      sessions: weeklySessions,
    },
    activities,
  }
}

export default {
  getDashboardOverview,
}