import fitnessTrackerModel from '../fitness-tracker/fitnessTrackerModel.js'
import progressChartsModel from '../progress-charts/progressChartsModel.js'
import profileModel from '../profile/profileModel.js'

// ── date helpers (local-server time, YYYY-MM-DD strings) ─────────────────────

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayDate() {
  return toDateStr(new Date())
}

// Monday..Sunday of the current week, as YYYY-MM-DD strings
function getThisWeekDates() {
  const today = new Date()
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek - 1))

  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(toDateStr(d))
  }
  return dates
}

// Last 7 calendar days (oldest..today)
function getLast7Dates() {
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(toDateStr(d))
  }
  return dates
}

// ── goals (per-user, from profile) ───────────────────────────────────────────

async function getGoals(userId) {
  const profile = await profileModel.findById(userId).lean()
  const goals = profile?.goals || {}
  return {
    steps: goals.steps ?? 10000,
    calories: goals.calories ?? 2000,
    water: goals.water ?? 8,
  }
}

// ── water history (from progress-charts) ─────────────────────────────────────
// NOTE: progressChartsModel has no userId yet, so this is GLOBAL for now.
// TODO: when progress-charts is user-scoped, add `userId` to this query and
// pass userId in. The rest of the dashboard does not need to change.
async function getWaterByDate(/* userId, */ dates) {
  const start = new Date(`${dates[0]}T00:00:00.000`)
  const endStr = dates[dates.length - 1]
  const end = new Date(`${endStr}T00:00:00.000`)
  end.setDate(end.getDate() + 1)

  const entries = await progressChartsModel
    .find({
      metric: 'waterGlasses',
      recordedFor: { $gte: start, $lt: end },
    })
    .lean()

  // Map each date -> glasses (latest entry that day wins)
  const byDate = {}
  for (const e of entries) {
    const key = toDateStr(new Date(e.recordedFor))
    byDate[key] = e.value
  }
  return byDate
}

// ── fitness aggregation per day (per-user) ───────────────────────────────────

function summariseDay(activities, date) {
  const dayLogs = activities.filter(a => a.date === date)
  return {
    steps: dayLogs
      .filter(a => a.type === 'steps')
      .reduce((sum, a) => sum + (a.steps || 0), 0),
    calories: dayLogs.reduce((sum, a) => sum + (a.calories || 0), 0),
    workouts: dayLogs.filter(a => a.type === 'workout').length,
  }
}

// Health score for one day, using the user's goals.
function dayHealthScore({ steps, calories, workouts, water }, goals) {
  const stepScore = Math.min((steps / goals.steps) * 100, 100)
  const waterScore = Math.min((water / goals.water) * 100, 100)
  const calorieScore = Math.min((calories / 500) * 100, 100)
  const workoutScore = workouts > 0 ? 100 : 0
  return Math.round(
    stepScore * 0.35 + waterScore * 0.20 + calorieScore * 0.20 + workoutScore * 0.25
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export async function getDashboardOverview(userId) {
  const today = getTodayDate()
  const weekDates = getThisWeekDates()
  const last7 = getLast7Dates()

  // Per-user fitness activities
  const activities = await fitnessTrackerModel.find({ userId }).lean()

  // Goals (per-user) + water (global for now)
  const goals = await getGoals(userId)
  const allDates = [...new Set([...weekDates, ...last7, today])].sort()
  const waterByDate = await getWaterByDate(allDates)

  // Today
  const todaySummary = summariseDay(activities, today)
  const todayWater = waterByDate[today] || 0

  // Weekly sessions (workouts logged Mon..Sun this week)
  const weeklySessions = activities.filter(a => {
    return a.type === 'workout' && weekDates.includes(a.date)
  }).length

  // Streak: consecutive days (ending today/yesterday) with a workout
  const streak = computeStreak(activities, today)

  // This week's trend (Mon..Sun health scores)
  const weeklyTrend = weekDates.map(date => {
    const s = summariseDay(activities, date)
    return {
      date,
      score: dayHealthScore({ ...s, water: waterByDate[date] || 0 }, goals),
    }
  })

  // Today's health score + 7-day average
  const todayScore = dayHealthScore({ ...todaySummary, water: todayWater }, goals)
  const last7Scores = last7.map(date => {
    const s = summariseDay(activities, date)
    return dayHealthScore({ ...s, water: waterByDate[date] || 0 }, goals)
  })
  const weeklyAverageScore = Math.round(
    last7Scores.reduce((sum, v) => sum + v, 0) / last7Scores.length
  )

  return {
    generatedAt: new Date().toISOString(),
    goals,
    today: {
      date: today,
      steps: todaySummary.steps,
      calories: todaySummary.calories,
      workouts: todaySummary.workouts,
      water: todayWater,
      healthScore: todayScore,
    },
    weekly: {
      sessions: weeklySessions,
      streak,
      averageScore: weeklyAverageScore,
      trend: weeklyTrend,
    },
  }
}

function computeStreak(activities, today) {
  const workoutDates = [...new Set(
    activities.filter(a => a.type === 'workout').map(a => a.date)
  )].sort((a, b) => new Date(b) - new Date(a))

  if (workoutDates.length === 0) return 0

  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = toDateStr(y)

  if (!workoutDates.includes(today) && !workoutDates.includes(yesterday)) {
    return 0
  }

  let streak = 1
  let checkDate = new Date(workoutDates[0])
  for (let i = 1; i < workoutDates.length; i++) {
    const diffDays = Math.round(
      Math.abs(checkDate - new Date(workoutDates[i])) / (1000 * 60 * 60 * 24)
    )
    if (diffDays === 1) {
      streak++
      checkDate = new Date(workoutDates[i])
    } else {
      break
    }
  }
  return streak
}

export default {
  getDashboardOverview,
}