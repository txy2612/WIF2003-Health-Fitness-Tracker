import express from 'express'
import { StatusCodes } from 'http-status-codes'
//instead of response.sttaus
import notificationService from './notificationService.js'
import validate from '../../middleware/validate.js'

import {
  postNotificationSchema,
  deleteNotificationSchema
} from './notificationValidation.js'

const router = express.Router()

router.get('/', async (request, response, next) => {
  try {
    const data = await notificationService.getNotifications()
    response.json(data)
  } catch (error) {
    next(error)
  }
})

router.post(
  '/',
  validate(postNotificationSchema),
  async (request, response, next) => {
    try {
      const { body } = request.validated

      const data = await notificationService.createNotification(body)

      response.status(StatusCodes.CREATED).json(data)
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  '/:id',
  validate(deleteNotificationSchema),
  async (request, response, next) => {
    try {
      const { id } = request.validated.params

      const deletedNotification =
        await notificationService.deleteNotification(id)

      if (!deletedNotification) {
        return response.status(StatusCodes.NOT_FOUND).json({
          message: 'Notification not found'
        })
      }

      response.status(StatusCodes.OK).json({
        message: 'Notification deleted successfully',
        data: deletedNotification,
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router