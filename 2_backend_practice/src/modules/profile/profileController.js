import express from 'express'
import { StatusCodes } from 'http-status-codes'
import profileService from './profileService.js'
import validate from '../../middleware/validate.js'
import requireAuth from '../../middleware/requireAuth.js'
import upload from '../../middleware/upload.js'
import {
  changePasswordSchema,
  updateGoalsSchema,
  updateProfileSchema,
} from './profileSchema.js'

const router = express.Router()

router.use(requireAuth)

// GET /api/v1/profile
router.get('/', async (request, response, next) => {
  try {
    const data = await profileService.getProfileOverview(request.user.id)
    response.status(StatusCodes.OK).json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/profile
router.put('/', validate(updateProfileSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await profileService.updateProfileOverview(request.user.id, body)
    response.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/profile/photo
router.post('/photo', upload.single('photo'), async (request, response, next) => {
  try {
    const data = await profileService.uploadPhoto(request.user.id, request.file)
    response.status(StatusCodes.OK).json({
      success: true,
      message: 'Photo uploaded',
      data,
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/profile/goals
router.put('/goals', validate(updateGoalsSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await profileService.updateGoals(request.user.id, body)
    response.status(StatusCodes.OK).json({
      success: true,
      message: 'Goals saved successfully',
      data,
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/profile/goals
router.delete('/goals', async (request, response, next) => {
  try {
    const data = await profileService.clearGoals(request.user.id)
    response.status(StatusCodes.OK).json({
      success: true,
      message: 'Goals cleared',
      data,
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/profile/change-password
router.put('/change-password', validate(changePasswordSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await profileService.changePassword(
      request.user.id,
      body.currentPassword,
      body.newPassword
    )
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/profile
router.delete('/', async (request, response, next) => {
  try {
    const data = await profileService.deleteProfile(request.user.id)
    response.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
})

export default router
