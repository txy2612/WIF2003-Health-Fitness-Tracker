import express from 'express'
import { StatusCodes } from 'http-status-codes'
import progressChartsService from './progressChartsService.js'
import validate from '../../middleware/validate.js'
import { getSchema, getRangePreviewSchema } from './progressChartsSchema.js'

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

export default router
