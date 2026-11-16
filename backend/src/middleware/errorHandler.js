import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  constructor(statusCode, errorCode, message, suggestedAlternatives) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    if (suggestedAlternatives !== undefined) {
      this.suggestedAlternatives = suggestedAlternatives;
    }
  }
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
      requestId,
      ...(err.suggestedAlternatives ? { suggestedAlternatives: err.suggestedAlternatives } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      requestId,
    });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err) {
    if (err.code === '23505') {
      res.status(409).json({
        error: 'SLOT_ALREADY_CONFIRMED',
        message: 'A unique constraint conflict occurred.',
        requestId,
      });
      return;
    }
    if (err.code === '23P01') {
      res.status(409).json({
        error: 'STUDENT_TIME_CONFLICT',
        message: 'Student already has an overlapping confirmed session.',
        requestId,
      });
      return;
    }
  }

  logger.error({ err, requestId, path: req.path, method: req.method }, 'Unhandled server error');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    requestId,
  });
}