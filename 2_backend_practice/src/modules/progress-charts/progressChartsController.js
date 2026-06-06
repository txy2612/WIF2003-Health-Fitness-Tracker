import express from 'express'
import { StatusCodes } from 'http-status-codes'
import progressChartsService from './progressChartsService.js'
import validate from '../../middleware/validate.js'
import { getSchema, getRangePreviewSchema, getWeeklySchema, getMonthlySchema } from './progressChartsSchema.js'


const router = express.Router()

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    const data = await progressChartsService.getProgressChartsOverview()

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

router.get('/range-preview', validate(getRangePreviewSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await progressChartsService.createRangePreview(query)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// ADD THIS ↓
// GET /api/v1/progress-charts/weekly?offset=0
// Called by buildWeekly() in progress-charts-wiring.js
// offset=0 means current week, -1 means last week (matches weekOffset in frontend)
router.get('/weekly', validate(getWeeklySchema), async (request, response, next) => {
  try {
    const { offset } = request.validated.query
    const data = await progressChartsService.getWeeklyFitnessData(offset)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})
 
// ADD THIS ↓
// GET /api/v1/progress-charts/monthly?offset=0
// Called by buildMonthly() in progress-charts-wiring.js
// offset=0 means current month, -1 means last month (matches monthOffset in frontend)
router.get('/monthly', validate(getMonthlySchema), async (request, response, next) => {
  try {
    const { offset } = request.validated.query
    const data = await progressChartsService.getMonthlyFitnessData(offset)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
