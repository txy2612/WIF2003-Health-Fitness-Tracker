import { z } from 'zod'

export const getSchema = z.object({
  body:   z.object({}).nullish(),
  params: z.object({}),
  query:  z.object({}),
})

export const getRangePreviewSchema = z.object({
  body:   z.object({}).nullish(),
  params: z.object({}),
  query:  z.object({
    range:  z.enum(['last-7-days', 'last-30-days']).default('last-7-days'),
    metric: z.enum(['activeMinutes', 'calories', 'waterGlasses']).default('activeMinutes'),
  }),
})

export const getWeeklySchema = z.object({
  body:   z.object({}).nullish(),
  params: z.object({}),
  query:  z.object({
    offset: z.coerce.number().int().default(0),
  }),
})

export const getMonthlySchema = z.object({
  body:   z.object({}).nullish(),
  params: z.object({}),
  query:  z.object({
    offset: z.coerce.number().int().default(0),
  }),
})

// ── WATER ─────────────────────────────────────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

export const getWaterSchema = z.object({
  body:   z.object({}).nullish(),
  params: z.object({}),
  query:  z.object({
    date: dateString.optional(),
  }),
})

export const postWaterSchema = z.object({
  body: z.object({
    date: dateString,
    glasses: z.coerce.number().int().min(0).max(50),
  }),
  params: z.object({}),
  query:  z.object({}),
})
