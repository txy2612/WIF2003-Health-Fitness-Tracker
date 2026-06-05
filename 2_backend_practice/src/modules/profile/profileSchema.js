import { z } from 'zod'

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email format").optional(),
    age: z.coerce.number().min(10).max(120).optional(),
    height: z.coerce.number().min(50).max(300).optional(),
    weight: z.coerce.number().min(20).max(300).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    goal: z.string().optional()
  }).strict(), // strict() blocks unexpected fields from being saved in the body

  params: z.object({}),
  query: z.object({})
});

export const updateGoalsSchema = z.object({
  body: z.object({
    steps: z.coerce.number().min(1000).max(50000).optional(),
    calories: z.coerce.number().min(500).max(5000).optional(),
    weight: z.coerce.number().min(30).max(200).optional()
  }).strict(),

  params: z.object({}),
  query: z.object({})
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters")
  }).strict(),

  params: z.object({}),
  query: z.object({})
});