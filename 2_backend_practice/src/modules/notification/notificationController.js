import express from 'express'//needed for router
import { StatusCodes } from 'http-status-codes'
//instead of response.sttaus

import notificationService from './notificationService.js'//Controller should not talk to DB directly
import validate from '../../middleware/validate.js'
import {
  deleteNotificationSchema,
  getNotificationSchema,
  patchNotificationSchema,
  postNotificationSchema,
} from './notificationSchema.js'

//mini router for notification module (mini receptionist for the department)
const router = express.Router()

router.get('/', validate(getNotificationSchema), async (request, response, next) => {
  try {
    const data = await notificationService.getNotifications()

    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

router.post('/', validate(postNotificationSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await notificationService.createNotification(body)

    response.status(StatusCodes.CREATED).json(data)
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', validate(patchNotificationSchema), async (request, response, next) => {
  try {
    const { id } = request.validated.params
    const { body } = request.validated
    const updatedNotification = await notificationService.updateNotification(id, body)

    if (!updatedNotification) {
      return response.status(StatusCodes.NOT_FOUND).json({
        message: 'Notification not found'
      })
    }

    response.status(StatusCodes.OK).json(updatedNotification)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', validate(deleteNotificationSchema), async (request, response, next) => {
  try {
    const { id } = request.validated.params
    const deletedNotification = await notificationService.deleteNotification(id)

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
})

export default router
