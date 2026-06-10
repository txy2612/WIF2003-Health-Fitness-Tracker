import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email format"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        age: z.coerce.number().optional(),
        gender: z.enum(['male', 'female', 'other', null]).optional(),
        weight: z.coerce.number().optional(),
        height: z.coerce.number().optional(),
        goal: z.string().optional()
    }).strict(),

    //We leave these empty because registration doesn't use URL parameters or queries
    params: z.object({}),
    query: z.object({})
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password is required")
    }).strict(),

    params: z.object({}),
    query: z.object({})
});