import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
  role: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .pipe(z.enum(['STUDENT', 'PROFESSOR', 'ADMIN']))
    .optional(),
}).strict();