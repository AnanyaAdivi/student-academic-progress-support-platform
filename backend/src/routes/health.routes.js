import { Router } from 'express';
import { checkDbHealth } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res, next) => {
  try {
    const dbOk = await checkDbHealth();
    if (!dbOk) {
      res.status(503).json({ status: 'degraded', db: 'down', requestId: req.requestId });
      return;
    }
    res.status(200).json({ status: 'ok', db: 'up', requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});