import express from 'express'
import dashboardService from './dashboardService.js'

const router = express.Router()

router.get('/', async (request, response, next) =>{
    try{
        const data = await dashboardService.getDashboardOverview()
        response.json(data)
    }catch(error){
        next(error)
    }
})

export default router