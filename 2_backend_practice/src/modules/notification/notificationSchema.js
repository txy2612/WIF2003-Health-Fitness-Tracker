import { z } from 'zod'

const channelSchema = z.enum(['workout', 'nutrition', 'hydration', 'progress', 'system', 'other'])
const futureDateSchema = z.coerce.date().refine((date) => date > new Date(), {
  message: 'scheduledFor must be in the future',
})

// backend checks again - user could bypass frontend validation
export const getNotificationSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
})

export const postNotificationSchema = z.object({
  body: z.object({
    channel: channelSchema,
    type: z.string().min(1).max(120).optional(),
    title: z.string().min(1).max(120),
    message: z.string().min(1).max(500),
    scheduledFor: futureDateSchema,
    completed: z.boolean().optional(),
    read: z.boolean().optional(),
    browserNotifiedAt: z.coerce.date().nullable().optional(),
  }),

  params: z.object({}),
  query: z.object({})
})

// patch = update part(some fields) of existing object
export const patchNotificationSchema = z.object({
  body: z.object({
    type: z.string().min(1).max(120).optional(),
    title: z.string().min(1).max(120).optional(),
    message: z.string().min(1).max(500).optional(),
    scheduledFor: futureDateSchema.optional(),
    completed: z.boolean().optional(),
    read: z.boolean().optional(),
    browserNotifiedAt: z.coerce.date().nullable().optional(),
  }).refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  }),

  params: z.object({
    id: z.string().min(1)
  }),

  query: z.object({})
})

export const deleteNotificationSchema = z.object({
  body: z.object({}),

  params: z.object({
    id: z.string().min(1)
  }),

  query: z.object({})
})
