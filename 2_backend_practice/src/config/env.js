import dotenv from 'dotenv'
import { z } from 'zod' //zod (here) = validates environment varaiables

dotenv.config({quiet: true})
//Why quiet? -> reduce console noise 
// not important but nice to have

const positiveIntWithDefault = (defaultValue) => z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().positive().default(defaultValue)
)

const booleanFromEnv = z.preprocess(
    (value) => {
        if (typeof value === 'boolean') return value
        if (typeof value !== 'string') return value

        return value.toLowerCase() === 'true'
    },
    z.boolean().default(false)
)

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),// give lots of details, great for debigging
    PORT: z.coerce.number().int().positive().default(3000),// coerce = convert type + validate + give error msg . Why not use Number()? only converts
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),//frontend = visitor to backend , CORS = backend's guest list (app still work well w/o this)
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required.'),
    MONGODB_DNS_SERVERS: z.string().default('1.1.1.1,8.8.8.8'),
    JWT_SECRET: z.string().trim().min(1).default('fittrack-development-secret'),
    SMTP_HOST: z.string().trim().default(''),
    SMTP_PORT: positiveIntWithDefault(587),
    SMTP_SECURE: booleanFromEnv,
    SMTP_USER: z.string().trim().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().trim().default('FitTrack <no-reply@fittrack.local>'),
    REMINDER_RECIPIENT_EMAIL: z.string().trim().default(''),
    REMINDER_CRON_SCHEDULE: z.string().trim().default('*/1 * * * *'),
    REMINDER_BATCH_SIZE: positiveIntWithDefault(10),
    REMINDER_SEND_LOCK_MINUTES: positiveIntWithDefault(10),
    REMINDER_TIMEZONE: z.string().trim().default('Asia/Kuala_Lumpur'),
})

const env = envSchema.parse(process.env)

export default env
