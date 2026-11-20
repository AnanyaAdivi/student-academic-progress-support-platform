import { Router } from 'express';
import { academicController } from '../controllers/academic.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../schemas/support.schema.js';
import {
  correctGradeBodySchema,
  createGradeBodySchema,
  studentProgressQuerySchema,
} from '../schemas/academic.schema.js';

export const academicRouter = Router();

academicRouter.get(
  '/students/:id/progress',
  requireAuth,
  validate({ params: uuidParamSchema, query: studentProgressQuerySchema }),
  academicController.getStudentProgress
);

academicRouter.post(
  '/assessments/:id/grades',
  requireAuth,
  requireRole('PROFESSOR'),
  validate({ params: uuidParamSchema, body: createGradeBodySchema }),
  academicController.createGrade
);

academicRouter.post(
  '/grades/:id/correct',
  requireAuth,
  requireRole('PROFESSOR'),
  validate({ params: uuidParamSchema, body: correctGradeBodySchema }),
  academicController.correctGrade
);

academicRouter.get(
  '/students/:id/history',
  requireAuth,
  validate({ params: uuidParamSchema }),
  academicController.getStudentHistory
);