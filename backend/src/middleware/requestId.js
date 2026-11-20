import { randomUUID } from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const incoming = req.header('X-Request-Id');
  const id = incoming && incoming.length <= 64 ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}