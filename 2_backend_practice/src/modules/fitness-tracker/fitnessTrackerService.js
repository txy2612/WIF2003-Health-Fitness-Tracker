import fitnessTrackerModel from './fitnessTrackerModel.js'

//why ansyc ?
// because later we'll do 'await databaseQuery()'

//Purpose: Prepare dashboard overview data for fitness tracker.
async function getFitnessTrackerOverview() {
    const activities = await fitnessTrackerModel
    .find({})//retrieve all from MongoDB
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
        activities,
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

//save activity function
async function createActivity(activity){
    //Model = database manager/helper !!!
    //create() = insert new into db
    return fitnessTrackerModel.create(activity)
}

// createActivity does not use ID bcz activity DOESNT EXIST YET
async function deleteActivity(id){
    return fitnessTrackerModel.findOneAndDelete({id})
    // findAndDelete() = built-in Mongoose method
    // id VS {id} :
    // _id = MongoDB's auto-generated ID
    // id = frontend-generated ID
    // findOneAndDelete({ id }) deletes the MongoDB document whose frontend id matches
    }

export default {
    getFitnessTrackerOverview,
    createActivity,
    deleteActivity
}
