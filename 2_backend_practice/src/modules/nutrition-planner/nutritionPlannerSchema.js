import { z } from 'zod'

// ── existing ────────────────────────────────────────────────────────────────

export const getSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    search: z.string().max(80).optional(),
  }),
})

// GET /hydration?date=YYYY-MM-DD  (used by the fitness page's water insight)
export const getHydrationSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

// ── favourites ────────────────────────────────────────────────────────────────

// POST /favourites
export const postFavouriteSchema = z.object({
  body: z.object({
    mealId: z.string().min(1),
    name: z.string().min(1),
    calories: z.coerce.number().nonnegative(),
    img: z.string().optional(),
  }),
  params: z.object({}),
  query: z.object({}),
})

// DELETE /favourites/:mealId
export const deleteFavouriteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    mealId: z.string().min(1, 'mealId is required'),
  }),
  query: z.object({}),
})

// ── today's plan ──────────────────────────────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

// One meal inside a plan slot
const planItem = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  calories: z.coerce.number().nonnegative(),
  img: z.string().optional(),
})

// PUT /plan  — saves the whole day's plan in one request
export const putPlanSchema = z.object({
  body: z.object({
    date: dateString,
    breakfast: z.array(planItem).default([]),
    lunch: z.array(planItem).default([]),
    dinner: z.array(planItem).default([]),
  }),
  params: z.object({}),
  query: z.object({}),
})
