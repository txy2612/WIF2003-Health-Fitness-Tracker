import { z } from 'zod'

export const getSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    search: z.string().max(80).optional(),
  }),
})

export const postCalorieGoalSchema = z.object({
  body: z.object({
    age: z.coerce.number().int().min(13).max(120),
    gender: z.enum(['female', 'male']),
    heightCm: z.coerce.number().positive().max(260),
    weightKg: z.coerce.number().positive().max(350),
    activityMultiplier: z.coerce.number().min(1.2).max(2.0),
    goal: z.enum(['lose', 'maintain', 'gain']),
  }),
  params: z.object({}),
  query: z.object({}),
})
