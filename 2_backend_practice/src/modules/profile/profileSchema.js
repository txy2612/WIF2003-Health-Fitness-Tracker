import { z } from 'zod'

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email('Invalid email format').max(254).optional(),
    age: z.coerce.number().min(10).max(120).optional(),
    height: z.coerce.number().min(50).max(300).optional(),
    weight: z.coerce.number().min(20).max(300).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    goal: z.enum(['lose', 'maintain', 'gain', 'fitness', 'endurance']).optional(),
    timezone: z.string().min(1).max(80).optional(),
    activityLevel: z.enum(['low', 'moderate', 'high']).optional(),
  }).strict(),
  params: z.object({}),
  query: z.object({}),
})

export const updateGoalsSchema = z.object({
  body: z.object({
    steps: z.coerce.number().min(1000).max(50000).optional(),
    calories: z.coerce.number().min(500).max(5000).optional(),
    weight: z.coerce.number().min(30).max(200).optional(),
    water: z.coerce.number().min(1).max(30).optional(),
  }).strict(),
  params: z.object({}),
  query: z.object({}),
})

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }).strict(),
  params: z.object({}),
  query: z.object({}),
})
