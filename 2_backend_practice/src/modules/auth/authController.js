import express from 'express'
import { StatusCodes } from 'http-status-codes'
import validate from '../../middleware/validate.js'
import { getSchema, postSchema } from './authSchema.js'

const router = express.Router()

router.get('/', validate(getSchema), async (request, response, next) => {
  try {
    response.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    next(error)
  }
})

router.post('/', validate(postSchema), async (request, response, next) => {
  try {
    response.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    next(error)
  }
})

export default router
