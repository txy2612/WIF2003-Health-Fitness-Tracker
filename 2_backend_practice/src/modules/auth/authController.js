import express from 'express'
import { StatusCodes } from 'http-status-codes'
import authService from './authService.js'
import validate from '../../middleware/validate.js'
import { registerSchema, loginSchema } from './authSchema.js'

const router = express.Router()

router.post('/register', validate(registerSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await authService.registerUser(body)

    response.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Registration successful',
      data
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', validate(loginSchema), async (request, response, next) => {
  try {
    const { body } = request.validated
    const data = await authService.loginUser(body.email, body.password)

    response.status(StatusCodes.OK).json({
      success: true,
      message: 'Login successful',
      data
    })
  } catch (error) {
    next(error)
  }
})

export default router