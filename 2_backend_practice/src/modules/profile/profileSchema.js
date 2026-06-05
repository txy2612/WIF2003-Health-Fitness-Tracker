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
    stepsGoal: z.coerce.number().int().positive().optional(),
    caloriesGoal: z.coerce.number().int().positive().optional(),
    weightGoal: z.coerce.number().positive().optional(),
    waterGoal: z.coerce.number().int().positive().optional(),
  }),
  params: z.object({}),
  query: z.object({}),
})

export const putProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(120),
    email: z.string().email().max(254),
    timezone: z.string().min(1).max(80),
    goal: z.string().min(1).max(200),
    heightCm: z.coerce.number().positive().max(260),
    weightKg: z.coerce.number().positive().max(350),
    activityLevel: z.enum(['low', 'moderate', 'high']),
    stepsGoal: z.coerce.number().int().positive().optional(),
    caloriesGoal: z.coerce.number().int().positive().optional(),
    weightGoal: z.coerce.number().positive().optional(),
    waterGoal: z.coerce.number().int().positive().optional(),
  }),
  params: z.object({}),
  query: z.object({}),
})
