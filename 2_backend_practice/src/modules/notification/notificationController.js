import express from 'express'//needed for router
import { StatusCodes } from 'http-status-codes'
//instead of response.sttaus

import notificationService from './notificationService.js'//Controller should not talk to DB directly
import validate from '../../middleware/validate.js'
import { postNotificationSchema, deleteNotificationSchema } from './notificationSchema.js'

//mini router for notification module (mini receptionist for the department)
const router = express.Router()

router.get('/', validate(postNotificationSchema), async (request, response, next) => {
  try {
    const { query } = request.validated
    const data = await notificationService.getNotification()

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

router.post('/', validate(postPreviewSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await notificationService.createNotificationPreview(body)

    response.status(StatusCodes.CREATED).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
