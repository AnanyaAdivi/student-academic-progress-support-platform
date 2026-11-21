import { Router } from 'express';
import { supportController } from '../controllers/support.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRequestBodySchema,
  createSlotBodySchema,
  listRequestsQuerySchema,
  listSlotsQuerySchema,
  rescheduleRequestBodySchema,
  uuidParamSchema,
} from '../schemas/support.schema.js';

export const supportRouter = Router();

supportRouter.get('/slots', requireAuth, validate({ query: listSlotsQuerySchema }), supportController.listSlots);
supportRouter.post('/slots', requireAuth, requireRole('PROFESSOR'), validate({ body: createSlotBodySchema }), supportController.createSlot);
supportRouter.delete('/slots/:id', requireAuth, requireRole('PROFESSOR'), validate({ params: uuidParamSchema }), supportController.deleteSlot);

supportRouter.post('/slots/:id/requests', requireAuth, requireRole('STUDENT'), validate({ params: uuidParamSchema, body: createRequestBodySchema }), supportController.createRequest);
supportRouter.get('/requests', requireAuth, requireRole('STUDENT', 'PROFESSOR'), validate({ query: listRequestsQuerySchema }), supportController.listMyRequests);
supportRouter.post('/requests/:id/cancel', requireAuth, requireRole('STUDENT'), validate({ params: uuidParamSchema }), supportController.cancelRequest);
supportRouter.post('/requests/:id/confirm', requireAuth, requireRole('PROFESSOR'), validate({ params: uuidParamSchema }), supportController.confirmRequest);
supportRouter.post('/requests/:id/reschedule', requireAuth, requireRole('PROFESSOR'), validate({ params: uuidParamSchema, body: rescheduleRequestBodySchema }), supportController.rescheduleRequest);
