import fitnessTrackerModel from './fitnessTrackerModel.js'
import { StatusCodes } from 'http-status-codes'

//why ansyc ?
// because later we'll do 'await databaseQuery()'

//Purpose: Prepare dashboard overview data for fitness tracker.
async function getFitnessTrackerOverview(userId) {
    const activities = await fitnessTrackerModel
    .find({ userId })//retrieve only this user's records from MongoDB
    .sort({ loggedAt : -1 })//sort -1 = descending = latest first
    .lean()//convert MongoDB doc into plain JS objects

    // now we reduce 'activities' array
  const completedMinutes = activities.reduce(
    (sum, activity) => sum + (activity.duration || 0),
    0
  )

  const totalCalories = activities.reduce(
    (sum, activity) => sum + (activity.calories || 0),
    0
  )

  const activeMinutes = 300
  
    //return API reponse data
    return {
        generatedAt: new Date().toISOString(),//generates current timestamp - for front-end to know
        activities: activities.map(formatActivity),
        totalCalories,
        weeklyGoal: {
          activeMinutes,
          completedMinutes,
          workoutsPlanned: 5,
          //filter bcz type:'workout' OR type:'steps'
          workoutsCompleted:activities.filter( activity => activity.type === 'workout'
      ).length,
    },
    goalProgressPercent: Math.round((completedMinutes / activeMinutes) * 100),
  }
}

function formatActivity(activity){
    const plainActivity = activity?.toObject ? activity.toObject() : { ...activity }

    delete plainActivity._id
    delete plainActivity.__v
    delete plainActivity.userId

    return plainActivity
}

async function getActivities(userId){
    const activities = await fitnessTrackerModel
    .find({ userId })
    .sort({ loggedAt: -1 })
    .lean()

    return {
        activities: activities.map(formatActivity)
    }
}

function createDuplicateStepsError(date){
    const error = new Error(`A steps activity already exists for ${date}.`)
    error.status = StatusCodes.CONFLICT
    error.title = 'Duplicate steps activity'
    error.type = 'about:blank'
    return error
}

function isDuplicateStepsKeyError(error){
    return error?.code === 11000
        && (error?.keyValue?.type === 'steps'
            || (error?.keyPattern?.type && error?.keyPattern?.date))
}

//save activity function
async function createActivity(userId, activity){
    if(activity.type === 'steps'){
        const existingStepsActivity = await fitnessTrackerModel.exists({
            userId,
            type: 'steps',
            date: activity.date,
        })

        if(existingStepsActivity){
            throw createDuplicateStepsError(activity.date)
        }
    }

    //Model = database manager/helper !!!
    //create() = insert new into db
    try{
        const createdActivity = await fitnessTrackerModel.create({
            ...activity,
            userId,
        })
        return formatActivity(createdActivity)
    }catch(error){
        if(isDuplicateStepsKeyError(error)){
            throw createDuplicateStepsError(activity.date)
        }

        throw error
    }
}

// createActivity does not use ID bcz activity DOESNT EXIST YET
async function deleteActivity(userId, id){
    const deletedActivity = await fitnessTrackerModel.findOneAndDelete({ id, userId })
    return deletedActivity ? formatActivity(deletedActivity) : null
    // findAndDelete() = built-in Mongoose method
    // id VS {id} :
    // _id = MongoDB's auto-generated ID
    // id = frontend-generated ID
    // findOneAndDelete({ id }) deletes the MongoDB document whose frontend id matches
    }

export default {
    getFitnessTrackerOverview,
    getActivities,
    createActivity,
    deleteActivity
}
