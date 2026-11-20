import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export const ACCESS_COOKIE_NAME = 'sap_access';
export const REFRESH_COOKIE_NAME = 'sap_refresh';

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    }
  );
}

export function requireAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
    };
    next();
  } catch {
    next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired authentication session.'));
  }
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}