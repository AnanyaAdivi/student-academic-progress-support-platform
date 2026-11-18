import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
      requestId: req.requestId ?? 'unknown',
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later.',
      requestId: req.requestId ?? 'unknown',
    });
  },
});