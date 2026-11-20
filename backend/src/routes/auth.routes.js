import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { loginBodySchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/auth/login', authRateLimiter, validate({ body: loginBodySchema }), authController.login);
authRouter.post('/auth/refresh', authRateLimiter, authController.refresh);
authRouter.post('/auth/logout', requireAuth, authController.logout);
authRouter.get('/me', requireAuth, authController.me);