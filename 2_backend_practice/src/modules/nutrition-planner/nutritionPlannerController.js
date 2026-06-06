import express from 'express'
import { StatusCodes } from 'http-status-codes'
import nutritionPlannerService from './nutritionPlannerService.js'
import validate from '../../middleware/validate.js'
import requireAuth from '../../middleware/requireAuth.js'
import {
  getSchema,
  getHydrationSchema,
  postCalorieGoalSchema,
  postFavouriteSchema,
  deleteFavouriteSchema,
  putPlanSchema,
} from './nutritionPlannerSchema.js'

const router = express.Router()

// ── public: catalogue + calorie calculator + hydration (not user-specific) ───

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await nutritionPlannerService.getNutritionPlannerOverview(query)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/nutrition-planner/hydration?date=YYYY-MM-DD
// Used by the fitness page water insight. Kept public to match original.
router.get('/hydration', validate(getHydrationSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await nutritionPlannerService.getHydrationForDate(query)

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

// ── favourites + plan: require login, scoped to the logged-in user ───────────

// GET /api/v1/nutrition-planner/favourites
router.get('/favourites', requireAuth, async (request, response, next) => {
  try {
    const data = await nutritionPlannerService.getFavourites(request.user.id)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/nutrition-planner/favourites
router.post('/favourites', requireAuth, validate(postFavouriteSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await nutritionPlannerService.addFavourite(request.user.id, body)

    response.status(StatusCodes.CREATED).json(data)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/nutrition-planner/favourites/:mealId
router.delete('/favourites/:mealId', requireAuth, validate(deleteFavouriteSchema), async (request, response, next) => {
  try {
    const { mealId } = request.validated.params
    const deleted = await nutritionPlannerService.removeFavourite(request.user.id, mealId)

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

// GET /api/v1/nutrition-planner/plan?date=YYYY-MM-DD
router.get('/plan', requireAuth, async (request, response, next) => {
  try {
    const date = request.query.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      response.status(StatusCodes.BAD_REQUEST).json({ message: 'date query param required as YYYY-MM-DD' })
      return
    }
    const data = await nutritionPlannerService.getPlan(request.user.id, date)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/nutrition-planner/plan
router.put('/plan', requireAuth, validate(putPlanSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await nutritionPlannerService.savePlan(request.user.id, body)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
