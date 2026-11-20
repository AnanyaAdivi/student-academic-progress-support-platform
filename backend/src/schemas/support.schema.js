import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid resource ID format'),
});

export const listSlotsQuerySchema = z.object({
  professorId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const createSlotBodySchema = z
  .object({
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: 'endTime must be strictly after startTime',
    path: ['endTime'],
  });

export const createRequestBodySchema = z
  .object({
    topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long'),
  })
  .strict();

export const listRequestsQuerySchema = z.object({
  mine: z.enum(['true', 'false']).optional(),
});

export const rescheduleRequestBodySchema = z
  .object({
    newSlotId: z.string().uuid('Valid newSlotId UUID is required'),
  })
  .strict();