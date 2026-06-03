import { z } from 'zod'

const channelSchema = z.enum(['workout', 'nutrition', 'hydration', 'progress', 'system', 'other'])

export const getNotificationSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
})

export const postNotificationSchema = z.object({
  body: z.object({
    channel: channelSchema,
    title: z.string().min(1).max(120),
    message: z.string().min(1).max(500),
    scheduledFor: z.coerce.date(),
    completed: z.boolean().optional(),
    read: z.boolean().optional(),
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
