import express from 'express'
import { StatusCodes } from 'http-status-codes'
import nutritionPlannerService from './nutritionPlannerService.js'
import validate from '../../middleware/validate.js'
import { getHydrationSchema, getSchema, postCalorieGoalSchema } from './nutritionPlannerSchema.js'

const router = express.Router()

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await nutritionPlannerService.getNutritionPlannerOverview(query)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

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

export default router
