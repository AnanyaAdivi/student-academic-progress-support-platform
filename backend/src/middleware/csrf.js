import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export const CSRF_COOKIE_NAME = 'sap_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken() {
  const nonce = randomBytes(24).toString('hex');
  const sig = createHmac('sha256', env.CSRF_SECRET).update(nonce).digest('hex');
  return `${nonce}.${sig}`;
}

export function verifyCsrfTokenSignature(token) {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [nonce, sig] = parts;
  if (!nonce || !sig || sig.length !== 64) return false;

  const expectedSig = createHmac('sha256', env.CSRF_SECRET).update(nonce).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function setCsrfCookie(res) {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return token;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set(['/api/auth/login']);

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method) || CSRF_EXEMPT_PATHS.has(req.originalUrl.split('?')[0] ?? '')) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header(CSRF_HEADER_NAME);

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken !== headerToken ||
    !verifyCsrfTokenSignature(cookieToken)
  ) {
    next(new AppError(403, 'FORBIDDEN', 'Invalid or missing CSRF token.'));
    return;
  }

  next();
}