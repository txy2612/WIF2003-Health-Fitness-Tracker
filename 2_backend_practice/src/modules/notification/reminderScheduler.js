import cron from 'node-cron' // runs things on a schedule 'alarm clock'
import env from '../../config/env.js'
import { processDueReminders } from './reminderProcessor.js'

// this file is where it all begins -> imported in App.ts
let reminderTask // current cron job
let isProcessing = false

function logProcessorResult(result) {
  if (result.processed > 0 || result.failed > 0) {
    console.log(`Reminder scheduler processed ${result.processed}; sent ${result.sent}; failed ${result.failed}`)
  }
}

async function runReminderProcessor() {
  if (isProcessing) return

  isProcessing = true

  try {
    const result = await processDueReminders()
    logProcessorResult(result)
  } catch (error) {
    console.error(`Reminder scheduler failed: ${error.message}`)
  } finally {
    isProcessing = false
  }
}

// runs a cron schedule while backend is open
// calls processDueReminders()
function startReminderScheduler() {
  // if running automated tests, dont start corn 
  if (env.NODE_ENV === 'test') return null
  // if already started, return existing scheduler
  // else would create many cron jobs
  if (reminderTask) return reminderTask

  if (!cron.validate(env.REMINDER_CRON_SCHEDULE)) {
    throw new Error(`Invalid REMINDER_CRON_SCHEDULE: ${env.REMINDER_CRON_SCHEDULE}`)
  }

  reminderTask = cron.schedule(
    env.REMINDER_CRON_SCHEDULE,
    runReminderProcessor,
    {
      timezone: env.REMINDER_TIMEZONE,
    }
  )

  console.log(`Reminder scheduler started with schedule: ${env.REMINDER_CRON_SCHEDULE}`)

  // Run once when the backend starts, then keep using the cron schedule.
  runReminderProcessor()

  return reminderTask
}

export {
  startReminderScheduler,
}

export default {
  startReminderScheduler,
}
