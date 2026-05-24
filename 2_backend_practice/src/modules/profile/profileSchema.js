import { z } from 'zod'

export const getSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
})

export const putProfilePreviewSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(120),
    goal: z.string().min(1).max(200),
    heightCm: z.coerce.number().positive().max(260),
    weightKg: z.coerce.number().positive().max(350),
    activityLevel: z.enum(['low', 'moderate', 'high']),
  }),
  params: z.object({}),
  query: z.object({}),
})
