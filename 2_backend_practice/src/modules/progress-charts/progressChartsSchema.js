import { z } from 'zod'

export const getSchema = z.object({
  body:   z.object({}).nullish(),   // ← add .nullish()
  params: z.object({}),
  query:  z.object({}),
})

export const getRangePreviewSchema = z.object({
  body:   z.object({}).nullish(),   // ← add .nullish()
  params: z.object({}),
  query:  z.object({
    range:  z.enum(['last-7-days', 'last-30-days']).default('last-7-days'),
    metric: z.enum(['activeMinutes', 'calories', 'waterGlasses']).default('activeMinutes'),
  }),
})

export const getWeeklySchema = z.object({
  body:   z.object({}).nullish(),   // ← already has this
  params: z.object({}),
  query:  z.object({
    offset: z.coerce.number().int().default(0),
  }),
})

export const getMonthlySchema = z.object({
  body:   z.object({}).nullish(),   // ← already has this
  params: z.object({}),
  query:  z.object({
    offset: z.coerce.number().int().default(0),
  }),
})