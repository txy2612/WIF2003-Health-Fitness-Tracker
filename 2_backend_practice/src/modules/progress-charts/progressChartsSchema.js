import { z } from 'zod'

export const getSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
})

export const getRangePreviewSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    range: z.enum(['last-7-days', 'last-30-days']).default('last-7-days'),
    metric: z.enum(['activeMinutes', 'calories', 'waterGlasses']).default('activeMinutes'),
  }),
})
