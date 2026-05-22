import { z } from 'zod'

//z.object(...) defines expected input shape
export const postActivitySchema = z.object({
  body: z.object({
    type: z.enum(['workout', 'steps']),

    activity: z.string().optional(),

    duration: z.number().nonnegative().optional(),

    steps: z.number().int().nonnegative().optional(),

    calories: z.number().nonnegative(),

    date: z.string(),

    notes: z.string().optional(),

    loggedAt: z.string().optional(),
  }),

  //NOT NECC
  params: z.object({}),//no params expected
  query: z.object({}),// noquery expeceted
  //only body is being validated
})

// DELETE /activities/:id 
export const deleteActivitySchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().min(1, 'Activity ID is required'),//expects an ID from the URL
  }),
  query: z.object({})
})
