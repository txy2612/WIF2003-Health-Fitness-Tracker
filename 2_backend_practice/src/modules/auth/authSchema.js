import {z} from "zod";

export const getSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({}),
})

export const postSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({}),
})
