import express from 'express'
import { StatusCodes } from 'http-status-codes'
import profileService from './profileService.js'
import validate from '../../middleware/validate.js'
import { getSchema, putProfilePreviewSchema } from './profileSchema.js'

const router = express.Router()

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    const data = await profileService.getProfileOverview()

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

router.put('/preview', validate(putProfilePreviewSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await profileService.updateProfilePreview(body)

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
