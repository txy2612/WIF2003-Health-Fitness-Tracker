import express from 'express'
import { StatusCodes } from 'http-status-codes'
import progressChartsService from './progressChartsService.js'
import validate from '../../middleware/validate.js'
import requireAuth from '../../middleware/requireAuth.js'
import {
  getSchema,
  getRangePreviewSchema,
  getWeeklySchema,
  getMonthlySchema,
  getWaterSchema,
  postWaterSchema,
} from './progressChartsSchema.js'

const router = express.Router()

// Protect everything so request.user is set (matches the other modules).
router.use(requireAuth)

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    const data = await progressChartsService.getProgressChartsOverview(request.user.id)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

router.get('/range-preview', validate(getRangePreviewSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await progressChartsService.createRangePreview(request.user.id, query)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// ── WATER ─────────────────────────────────────────────────────────────────────

// GET /api/v1/progress-charts/water?date=YYYY-MM-DD
router.get('/water', validate(getWaterSchema), async (request, response, next) => {
  try {
    const { date } = request.validated.query
    const data = await progressChartsService.getWater(request.user.id, date)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/progress-charts/water   body: { date, glasses }
router.post('/water', validate(postWaterSchema), async (request, response, next) => {
  try {
    const { date, glasses } = request.validated.body
    const data = await progressChartsService.setWater(request.user.id, date, glasses)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/progress-charts/weekly?offset=0
router.get('/weekly', validate(getWeeklySchema), async (request, response, next) => {
  try {
    const { offset } = request.validated.query
    const data = await progressChartsService.getWeeklyFitnessData(request.user.id, offset)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/progress-charts/monthly?offset=0
router.get('/monthly', validate(getMonthlySchema), async (request, response, next) => {
  try {
    const { offset } = request.validated.query
    const data = await progressChartsService.getMonthlyFitnessData(request.user.id, offset)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
