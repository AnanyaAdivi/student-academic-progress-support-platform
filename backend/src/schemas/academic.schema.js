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

export const importGradeRowSchema = z
  .object({
    rowNumber: z.number().int().positive().optional(),
    studentId: z.string().trim().min(1, 'studentId is required'),
    studentName: z.string().trim().min(1).max(200).optional(),
    score: z.number().min(0, 'Score cannot be negative'),
    maxScore: z.number().positive('maxScore must be greater than 0'),
  })
  .refine((row) => row.score <= row.maxScore, {
    message: 'Score cannot exceed maxScore',
    path: ['score'],
  });

export const importGradesBodySchema = z
  .object({
    courseCode: z.string().trim().min(1, 'courseCode is required').max(32),
    courseName: z.string().trim().max(200).optional(),
    assessmentName: z.string().trim().min(1, 'assessmentName is required').max(120),
    professorId: z.string().optional(),
    rows: z.array(importGradeRowSchema).min(1, 'At least one grade row is required').max(500),
  })
  .strict();
