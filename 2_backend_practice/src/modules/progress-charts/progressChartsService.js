import progressChartsModel from './progressChartsModel.js'
import fitnessTrackerModel from '../fitness-tracker/fitnessTrackerModel.js'

// Normalise a YYYY-MM-DD string to that day at 00:00 (local) as a Date.
function dayStart(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(start, days) {
  const next = new Date(start)
  next.setDate(next.getDate() + days)
  return next
}

function createDateRange(days) {
  const end = dayStart()
  const start = addDays(end, -(days - 1))

  return { start, end }
}

function getRangeWindow(range) {
  return range === 'last-30-days'
    ? createDateRange(30)
    : createDateRange(7)
}

async function getWaterEntries(userId, start, end) {
  return progressChartsModel
    .find({
      userId,
      metric: 'waterGlasses',
      recordedFor: {
        $gte: start,
        $lte: end,
      },
    })
    .sort({ recordedFor: 1 })
    .lean()
}

function getDateLabels(start, end) {
  const labels = []

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    labels.push(toDateStr(cursor))
  }

  return labels
}

function groupFitnessLogsByDate(logs, labels) {
  const byDate = Object.create(null)

  for (const label of labels) {
    byDate[label] = {
      activeMinutes: 0,
      calories: 0,
    }
  }

  for (const log of logs) {
    if (!byDate[log.date]) {
      continue
    }

    byDate[log.date].calories += log.calories || 0

    if (log.type === 'workout') {
      byDate[log.date].activeMinutes += log.duration || 0
    }
  }

  return byDate
}

function groupWaterByDate(entries) {
  const byDate = Object.create(null)

  for (const entry of entries) {
    byDate[toDateStr(entry.recordedFor)] = entry.value
  }

  return byDate
}

async function buildMetricSeries(userId, labels, start, end) {
  const [waterEntries, fitnessLogs] = await Promise.all([
    getWaterEntries(userId, start, end),
    fitnessTrackerModel.find({ userId, date: { $in: labels } }).lean(),
  ])

  const waterByDate = groupWaterByDate(waterEntries)
  const fitnessByDate = groupFitnessLogsByDate(fitnessLogs, labels)

  return {
    activeMinutes: labels.map((label) => fitnessByDate[label]?.activeMinutes ?? 0),
    calories: labels.map((label) => fitnessByDate[label]?.calories ?? 0),
    waterGlasses: labels.map((label) => waterByDate[label] ?? 0),
  }
}

async function getProgressChartsOverview(userId) {
  const range = 'last-7-days'
  const { start, end } = getRangeWindow(range)
  const labels = getDateLabels(start, end)
  const series = await buildMetricSeries(userId, labels, start, end)

  return {
    generatedAt: new Date().toISOString(),
    range,
    labels,
    series,
    summary: {
      totalActiveMinutes: sum(series.activeMinutes),
      averageCalories: average(series.calories, 0),
      averageWaterGlasses: average(series.waterGlasses, 1),
    },
  }
}

async function createRangePreview(userId, query) {
  const { start, end } = getRangeWindow(query.range)
  const labels = getDateLabels(start, end)
  const series = await buildMetricSeries(userId, labels, start, end)

  return {
    range: query.range,
    metric: query.metric,
    labels,
    values: series[query.metric],
  }
}

// ── WATER ─────────────────────────────────────────────────────────────────────

// Read this user's water glasses for a given date (defaults to today).
async function getWater(userId, dateStr) {
  const start = dayStart(dateStr)
  const entry = await progressChartsModel
    .findOne({ userId, metric: 'waterGlasses', recordedFor: start })
    .lean()

  return {
    date: start.toISOString().slice(0, 10),
    glasses: entry ? entry.value : 0,
  }
}

// Set (upsert) this user's water glasses for a date. Called when the user
// taps a glass on the nutrition page.
async function setWater(userId, dateStr, glasses) {
  const start = dayStart(dateStr)

  const entry = await progressChartsModel.findOneAndUpdate(
    { userId, metric: 'waterGlasses', recordedFor: start },
    { userId, metric: 'waterGlasses', recordedFor: start, value: glasses },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean()

  return {
    date: start.toISOString().slice(0, 10),
    glasses: entry.value,
  }
}

async function getWaterByDate(userId, dates) {
  if (dates.length === 0) {
    return {}
  }

  const start = dayStart(dates[0])
  const end = dayStart(dates[dates.length - 1])

  return groupWaterByDate(await getWaterEntries(userId, start, end))
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

async function getWeeklyFitnessData(userId, offset) {
  const dates     = getWeekDates(offset)
  const prevDates = getWeekDates(offset - 1)

  const [currentLogs, prevLogs] = await Promise.all([
    fitnessTrackerModel.find({ userId, date: { $in: dates } }).lean(),
    fitnessTrackerModel.find({ userId, date: { $in: prevDates } }).lean(),
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

async function getMonthlyFitnessData(userId, offset) {
  const dates     = getMonthDates(offset)
  const prevDates = getMonthDates(offset - 1)

  const [currentLogs, prevLogs] = await Promise.all([
    fitnessTrackerModel.find({ userId, date: { $in: dates } }).lean(),
    fitnessTrackerModel.find({ userId, date: { $in: prevDates } }).lean(),
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
  getWeeklyFitnessData,
  getMonthlyFitnessData,
  getWater,
  getWaterByDate,
  setWater,
}
