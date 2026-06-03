import express from 'express'
import { StatusCodes } from 'http-status-codes'
import nutritionPlannerService from './nutritionPlannerService.js'
import validate from '../../middleware/validate.js'
import {
  getSchema,
  postCalorieGoalSchema,
  postFavouriteSchema,
  deleteFavouriteSchema,
  getPlanSchema,
  putPlanSchema,
} from './nutritionPlannerSchema.js'

const router = express.Router()

// ── existing: catalogue + calorie calculator ─────────────────────────────────

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await nutritionPlannerService.getNutritionPlannerOverview(query)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

router.post('/calorie-goal', validate(postCalorieGoalSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await nutritionPlannerService.calculateCalorieGoal(body)

    response.status(StatusCodes.CREATED).json(data)
  } catch (error) {
    next(error)
  }
})

// ── favourites ────────────────────────────────────────────────────────────────

// GET /api/v1/nutrition-planner/favourites
router.get('/favourites', async (request, response, next) => {
  try {
    const data = await nutritionPlannerService.getFavourites()

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/nutrition-planner/favourites
router.post('/favourites', validate(postFavouriteSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await nutritionPlannerService.addFavourite(body)

    response.status(StatusCodes.CREATED).json(data)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/nutrition-planner/favourites/:mealId
router.delete('/favourites/:mealId', validate(deleteFavouriteSchema), async (request, response, next) => {
  try {
    const { mealId } = request.validated.params
    const deleted = await nutritionPlannerService.removeFavourite(mealId)

    if (!deleted) {
      response.status(StatusCodes.NOT_FOUND).json({ message: 'Favourite not found' })
      return
    }

    response.status(StatusCodes.OK).json({
      message: 'Favourite removed successfully',
      data: deleted,
    })
  } catch (error) {
    next(error)
  }
})

// ── today's plan ──────────────────────────────────────────────────────────────

// GET /api/v1/nutrition-planner/plan?date=YYYY-MM-DD
router.get('/plan', async (request, response, next) => {
  try {
    const date = request.query.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      response.status(StatusCodes.BAD_REQUEST).json({ message: 'date query param required as YYYY-MM-DD' })
      return
    }
    const data = await nutritionPlannerService.getPlan(date)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/nutrition-planner/plan
router.put('/plan', validate(putPlanSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await nutritionPlannerService.savePlan(body)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
