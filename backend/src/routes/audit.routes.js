import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const auditRouter = Router();

auditRouter.get('/admin/audit/verify', requireAuth, requireRole('ADMIN'), auditController.verify);