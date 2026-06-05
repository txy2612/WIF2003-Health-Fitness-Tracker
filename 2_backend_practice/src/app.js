import express from 'express' //backend framework
import cors from 'cors'
import helmet from 'helmet'
import env from './config/env.js' //instead of const PORT = 300, now use env.PORT
import connectDatabase from './config/database.js'
import requestId from './middleware/requestId.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

import fitnessTrackerController from './modules/fitness-tracker/fitnessTrackerController.js'
import nutritionPlannerController from './modules/nutrition-planner/nutritionPlannerController.js'
import progressChartsController from './modules/progress-charts/progressChartsController.js'
import profileController from './modules/profile/profileController.js'
import authController from './modules/auth/authController.js'
import dashboardController from './modules/dashboard/dashboardController.js'

// Temporarily disabled until these legacy module paths exist again:
// import nutritionController from './modules/nutrition/nutritionController.js'
// import progressController from './modules/progress/progressController.js'
// import userProfileController from './modules/user-profile/userProfileController.js'
// import dashboard from './dashboard/dashboardController.js'
// import notificationController from './modules/notification/notificationController.js'

const app = express() // create app

//config middleware
app.use(requestId)//request-id be earlier -> evn cors can get an id
app.use(helmet())
app.use(cors()) // allow front-end to communicate with back-end
app.use(express.json())// translate incoming JSON body
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin'); //allowed browser to display this photo anywhere
  }
}));

// test route
app.get('/', (request, response) => {
  response.json({
    message: 'Backend is running',
  })
})

// redirect request to their modules
app.use('/api/v1/fitness-tracker', fitnessTrackerController)
app.use('/api/v1/auth', authController)
app.use('/api/v1/dashboard', dashboardController)
app.use('/api/v1/nutrition-planner', nutritionPlannerController)
app.use('/api/v1/progress-charts', progressChartsController)
app.use('/api/v1/profile', profileController)

// Temporarily disabled until these legacy route modules are restored:
// app.use('/api/v1/nutrition', nutritionController)
// app.use('/api/v1/progress', progressController)
// app.use('/api/v1/user-profile', userProfileController)
// app.use('/api/v1/notification', notificationController)

// Why after test route? notFoundHandler -> "No routes matched"
//these two ORDER matters 'Not found' -> 'error'
app.use(notFoundHandler)
app.use(errorHandler)

//connect database first
await connectDatabase()

// start server
app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`)
})
