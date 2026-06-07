import progressChartsModel from './progressChartsModel.js'
import fitnessTrackerModel from '../fitness-tracker/fitnessTrackerModel.js'

async function getProgressChartsOverview() {
  const entries = await progressChartsModel.find({}).sort({ recordedFor: 1 }).lean()
  const labels = getLabels(entries)
  const series = getSeries(entries)

  return {
    generatedAt: new Date().toISOString(),
    range: 'last-7-days',
    labels,
    series,
    summary: {
      totalActiveMinutes: sum(series.activeMinutes),
      averageCalories: average(series.calories, 0),
      averageWaterGlasses: average(series.waterGlasses, 1),
    },
  }
}

async function createRangePreview(query) {
  const entries = await progressChartsModel.find({ metric: query.metric }).sort({ recordedFor: 1 }).lean()

  return {
    range: query.range,
    metric: query.metric,
    labels: getLabels(entries),
    values: entries.map((entry) => entry.value),
  }
}

function getLabels(entries) {
  return [...new Set(entries.map((entry) => formatLabel(entry.recordedFor)))]
}

function formatLabel(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
}

function getSeries(entries) {
  return {
    activeMinutes: valuesForMetric(entries, 'activeMinutes'),
    calories: valuesForMetric(entries, 'calories'),
    waterGlasses: valuesForMetric(entries, 'waterGlasses'),
  }
}

function valuesForMetric(entries, metric) {
  return entries
    .filter((entry) => entry.metric === metric)
    .map((entry) => entry.value)
}

function average(values, decimalPlaces) {
  if (values.length === 0) {
    return 0
  }

  return Number((sum(values) / values.length).toFixed(decimalPlaces))
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

// ADD THIS ↓ — helper: build 7 date strings for a given week offset
function getWeekDates(offset) {
  const today  = new Date()
  const day    = today.getDay() === 0 ? 7 : today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day - 1) + (offset * 7))
  monday.setHours(0, 0, 0, 0)
 
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${dd}`)
  }
  return dates
}
 
// ADD THIS ↓ — helper: build date strings for a given month offset
function getMonthDates(offset) {
  const today = new Date()
  const year  = today.getFullYear()
  const month = today.getMonth() + offset
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
 
  const dates = []
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const y  = d.getFullYear()
    const m  = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${dd}`)
  }
  return dates
}

// ADD THIS ↓ — helper: fill missing dates with zeros so charts always
// get a full array (7 for weekly, 28-31 for monthly)
function fillMissingDates(rows, dates) {
  return dates.map(date => {
    const found = rows.find(r => r.date === date)
    return found || { date, steps: 0, workouts: [], calories: 0, duration: 0 }
  })
}
 
// ADD THIS ↓ — fetch one week of fitness data from MongoDB
// This replaces: _getLogs() + _stepsOnDates() + _workoutsOnDates() in the frontend
async function getWeeklyFitnessData(offset) {
  const dates    = getWeekDates(offset)
  const prevDates = getWeekDates(offset - 1)
 
  // Ask MongoDB for only the logs that fall within these dates
  // Instead of loading ALL logs like localStorage did
  const [currentLogs, prevLogs] = await Promise.all([
    fitnessTrackerModel.find({ date: { $in: dates } }).lean(),
    fitnessTrackerModel.find({ date: { $in: prevDates } }).lean(),
  ])
 
  // Group logs by date — same as the filter/reduce loops in your frontend
  function groupByDate(logs, datesToFill) {
    const grouped = datesToFill.map(date => {
      const dayLogs = logs.filter(l => l.date === date)
      return {
        date,
        steps:    dayLogs.filter(l => l.type === 'steps').reduce((s, l) => s + (l.steps || 0), 0),
        calories: dayLogs.reduce((s, l) => s + (l.calories || 0), 0),
        duration: dayLogs.filter(l => l.type === 'workout').reduce((s, l) => s + (l.duration || 0), 0),
        workouts: dayLogs.filter(l => l.type === 'workout').map(l => ({
          activity: l.activity,
          duration: l.duration,
          calories: l.calories,
        })),
      }
    })
    return grouped
  }
 
  return {
    dates,
    rows:     groupByDate(currentLogs, dates),
    prevRows: groupByDate(prevLogs, prevDates),
  }
}
 
// ADD THIS ↓ — same pattern but for a full month
async function getMonthlyFitnessData(offset) {
  const dates     = getMonthDates(offset)
  const prevDates = getMonthDates(offset - 1)
 
  const [currentLogs, prevLogs] = await Promise.all([
    fitnessTrackerModel.find({ date: { $in: dates } }).lean(),
    fitnessTrackerModel.find({ date: { $in: prevDates } }).lean(),
  ])
 
  function groupByDate(logs, datesToFill) {
    return datesToFill.map(date => {
      const dayLogs = logs.filter(l => l.date === date)
      return {
        date,
        steps:    dayLogs.filter(l => l.type === 'steps').reduce((s, l) => s + (l.steps || 0), 0),
        calories: dayLogs.reduce((s, l) => s + (l.calories || 0), 0),
        duration: dayLogs.filter(l => l.type === 'workout').reduce((s, l) => s + (l.duration || 0), 0),
        workouts: dayLogs.filter(l => l.type === 'workout').map(l => ({
          activity: l.activity,
          duration: l.duration,
          calories: l.calories,
        })),
      }
    })
  }
 
  return {
    dates,
    rows:     groupByDate(currentLogs, dates),
    prevRows: groupByDate(prevLogs, prevDates),
  }
}

export default {
  createRangePreview,
  getProgressChartsOverview,
  getWeeklyFitnessData,   // ← add this
  getMonthlyFitnessData,  // ← add this
}
