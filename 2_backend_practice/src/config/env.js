import dotenv from 'dotenv'
import { z } from 'zod' //zod (here) = validates environment varaiables

dotenv.config({quiet: true})
//Why quiet? -> reduce console noise 
// not important but nice to have

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),// give lots of details, great for debigging
    PORT: z.coerce.number().int().positive().default(3000),// coerce = convert type + validate + give error msg . Why not use Number()? only converts
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),//frontend = visitor to backend , CORS = backend's guest list (app still work well w/o this)
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required.'),
    MONGODB_DNS_SERVERS: z.string().default('1.1.1.1,8.8.8.8'),
})

const env = envSchema.parse(process.env)

export default env
