import mongoose from 'mongoose'// lib that helps Node.js communicate with MongoDB, prov functions like .find() .create() .findOne() .deleteOne()
import { connectDatabase } from './database.js'

//import seeds (data)
import fitnessTrackerSeeds from './seeds/fitnessTrackerSeeds.js'
import notificationSeeds from './seeds/notificationSeeds.js'
import nutritionPlannerSeeds from './seeds/nutritionPlannerSeeds.js'
import profileSeeds from './seeds/profileSeeds.js'
import progressChartsSeeds from './seeds/progressChartsSeeds.js'
import sampleSeeds from './seeds/sampleSeeds.js'

// imports models
import fitnessTrackerModel from '../modules/fitness-tracker/fitnessTrackerModel.js'
import notificationModel from '../modules/notification/notificationModel.js'
import nutritionPlannerModel from '../modules/nutrition-planner/nutritionPlannerModel.js'
import profileModel from '../modules/profile/profileModel.js'
import progressChartsModel from '../modules/progress-charts/progressChartsModel.js'
import sampleModel from '../modules/sample/sampleModel.js'


// pair seed data & models tgt
const seedJobs = [
  {
    name: 'FitnessTrackerActivity',//collection
    model: fitnessTrackerModel,//model
    documents: fitnessTrackerSeeds,//which seed data
    uniqueFilter: (activity) => ({
      //before inserting a seed, the script searches MongoDB using 'uniqueFilter'
      //If a matching doc found, the seed is skipped
      id: activity.id,
    }),
  },
  {
    name: 'Notification',
    model: notificationModel,
    documents: notificationSeeds,
    uniqueFilter: (notification) => ({
      channel: notification.channel,
      title: notification.title,
      scheduledFor: notification.scheduledFor,//before inserting a noti, check if a notification with the same channel, title, and scheduledFor already exist
    }),
  },
  {
    name: 'NutritionPlannerMeal',
    model: nutritionPlannerModel,
    documents: nutritionPlannerSeeds,
    uniqueFilter: (meal) => ({
      name: meal.name,
    }),
  },
  {
    name: 'Profile',
    model: profileModel,
    documents: profileSeeds,
    uniqueFilter: (profile) => ({
      email: profile.email,
    }),
  },
  {
    name: 'ProgressChartEntry',
    model: progressChartsModel,
    documents: progressChartsSeeds,
    uniqueFilter: (entry) => ({
      metric: entry.metric,
      recordedFor: entry.recordedFor,
    }),
  },
  {
    name: 'Sample',
    model: sampleModel,
    documents: sampleSeeds,
    uniqueFilter: (sample) => ({
      name: sample.name,
      goal: sample.goal,
    }),
  },
]

async function run() {
  await connectDatabase()//connects to MongoDB first

  try {
    //loops through every module's seed job
    for (const job of seedJobs) {
      // inserts only records that do not alr exist (into MongoDB)
      const result = await insertMissingDocuments(job)

      console.log(`${job.name}: inserted ${result.inserted}, skipped ${result.skipped}`)
    }
  } finally {
    // closes MongoDB connection after seeding
    await mongoose.disconnect()
  }
}

async function insertMissingDocuments({ model, documents, uniqueFilter }) {
  //create counters
  const result = {
    inserted: 0,
    skipped: 0,
  }

  // loop through every seed document
  for (const document of documents) {
    // check if doc alr exist
    const existingDocument = await model.findOne(uniqueFilter(document)).select('_id').lean()

    // found -> do not insert, move to next seed
    if (existingDocument) {
      result.skipped += 1
      continue
    }

    // not found -> insert into MongoDB
    await model.create(document)
    result.inserted += 1
  }

  return result
}

// if seeding crashes, log error, disconnect, and stop process
run().catch(async (error) => {
  console.error(`Seed insertion failed: ${error.message}`)
  await mongoose.disconnect()
  process.exit(1)// stop backend if DB crashes
})
