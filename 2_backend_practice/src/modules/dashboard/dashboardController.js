import express from 'express'
import dashboardService from './dashboardService.js'
import requireAuth from '../../middleware/requireAuth.js'

const router = express.Router()

// Protect the dashboard so request.user is set (matches profile/fitness/nutrition).
router.use(requireAuth)

router.get('/', async (request, response, next) => {
  try {
    const data = await dashboardService.getDashboardOverview(request.user.id)
    response.json(data)
  } catch (error) {
    next(error)
  }
})

export default router