import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { supportRouter } from './routes/support.routes.js';
import { academicRouter } from './routes/academic.routes.js';
import { auditRouter } from './routes/audit.routes.js';

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key', 'X-Request-Id'],
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiRateLimiter);
  app.use(csrfProtection);

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', supportRouter);
  app.use('/api', academicRouter);
  app.use('/api', auditRouter);

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.'));
  });

  app.use(errorHandler);
  return app;
}