// Controller = define endpoint
import express from 'express'
import { StatusCodes } from 'http-status-codes'
import fitnessTrackerService from './fitnessTrackerService.js'
import validate from '../../middleware/validate.js'
import { postActivitySchema, deleteActivitySchema } from './fitnessTrackerSchema.js'

// creates a mini router for fitness tracker (mini receptionist for the department)
const router = express.Router()

// '/' = root of fitness tracker module
// when connected in app.js , it bcms /api/v1/fitness-tracker
// to Get data from backend
router.get('/', async (request, response, next) => {
    try {
        //await = wait until SERVICE finishes (bcz services is async)
        const data = await fitnessTrackerService.getFitnessTrackerOverview()

        //if route succeeds, send reponse
        response.status(StatusCodes.OK).json(data)
  } catch (error) {//if fail, pass to handler
    next(error)
  }
})

// Save activities logged into MongoDB
router.post('/activities', validate(postActivitySchema), async (request, response, next) =>{
    try{

        const { body } = request.validated

        console.log('Vaidated body:', body)

        const data = await fitnessTrackerService.createActivity(body)
        
        response.status(StatusCodes.CREATED).json(data)
    }catch(error){
        next(error)//next = go to the next middleware/route
        //happn only when normal route does not work
    }
})


// DELETE /api/v1/fitness-tracker/activities/:id
router.delete('/activities/:id', validate(deleteActivitySchema), async (request, response, next) =>{
    try{
        const {id} = request.validated.params//params of validated request
        //DESTRUCTURING !! {id} = bla.bla.bla.id

        const deletedActivity = await fitnessTrackerService.deleteActivity(id)

        if (!deletedActivity){
            response.status(404).json({
                message: 'Activity not found'
            })
            return
        }

        response.status(200).json({
            message:'Activity deleted successfully',
            data: deletedActivity,
        })
    }catch(error){
        next(error)
    }
})

//allows app.js to import this controller
export default router
