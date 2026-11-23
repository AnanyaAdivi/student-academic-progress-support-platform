import { env } from '../config/env.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../middleware/auth.js';
import { CSRF_COOKIE_NAME, setCsrfCookie } from '../middleware/csrf.js';
import { authService } from '../services/auth.service.js';

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = env.NODE_ENV === 'production';

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
    path: '/',
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  setCsrfCookie(res);
}

function clearAuthCookies(res) {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie(ACCESS_COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/' });
  res.clearCookie(REFRESH_COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE_NAME, { httpOnly: false, secure: isProd, sameSite: 'strict', path: '/' });
}

export const authController = {
  async login(req, res, next) {
    try {
      const { email, password, role } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password, role);
      setAuthCookies(res, accessToken, refreshToken);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME];
      const { user, accessToken, refreshToken } = await authService.refresh(rawRefresh);
      setAuthCookies(res, accessToken, refreshToken);
      res.status(200).json({ user });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME];
      await authService.logout(rawRefresh);
      clearAuthCookies(res);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      if (!req.cookies?.[CSRF_COOKIE_NAME]) {
        setCsrfCookie(res);
      }
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },
};