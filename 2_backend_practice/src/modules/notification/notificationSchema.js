import { z } from 'zod'

export const postNotificationSchema = z.object({
  body: z.object({
    id: z.number(),

    type: z.string().min(1),

    title: z.string().optional(),

    datetime: z.string(),

    note: z.string().optional(),

    completed: z.boolean().optional(),
  }),

  params: z.object({}),
  query: z.object({})
})

export const deleteNotificationSchema = z.object({
  body: z.object({}),

  params: z.object({
    id: z.string().min(1)
  }),

  query: z.object({})
})