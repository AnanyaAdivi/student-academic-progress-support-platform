import { z } from 'zod';

export const studentProgressQuerySchema = z.object({
  asOf: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'asOf must be a valid ISO date or timestamp')
    .optional(),
});

export const createGradeBodySchema = z
  .object({
    studentId: z.string().uuid('Valid studentId UUID is required'),
    score: z.number().min(0, 'Score cannot be negative'),
    effectiveAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const correctGradeBodySchema = z
  .object({
    score: z.number().min(0, 'Score cannot be negative'),
    reason: z.string().trim().min(3, 'Correction reason is required').max(500),
    effectiveAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();