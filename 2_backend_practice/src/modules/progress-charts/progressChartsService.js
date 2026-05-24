import progressChartsModel from './progressChartsModel.js'

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

export default {
  createRangePreview,
  getProgressChartsOverview,
}
