import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { runMigrations } from '../../src/db/migrate.js';
import { runSeeds, DEV_PASSWORDS, SEED_IDS } from '../../src/db/seeds/seed.js';
import { pool } from '../../src/db/pool.js';

const app = createApp();

export function extractCookieValue(setCookieHeaders: string[] | undefined, name: string): string | undefined {
  if (!setCookieHeaders) return undefined;
  for (const header of setCookieHeaders) {
    if (header.startsWith(`${name}=`)) {
      return header.split(';')[0]?.slice(name.length + 1);
    }
  }
  return undefined;
}

describe('Phase 3: Authentication, Rotating Refresh, CSRF & Role Checks', () => {
  beforeAll(async () => {
    await runMigrations();
    await runSeeds();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('returns 401 UNAUTHENTICATED when no token, expired token, or tampered token is sent', async () => {
    // 1. No token
    const noTokenRes = await request(app).get('/api/me');
    expect(noTokenRes.status).toBe(401);
    expect(noTokenRes.body.error).toBe('UNAUTHENTICATED');

    // 2. Expired token
    const expiredToken = jwt.sign(
      { sub: SEED_IDS.studentId(1), email: 'student1@sau.int', role: 'STUDENT', fullName: 'Student 1' },
      env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: -10 }
    );
    const expiredRes = await request(app)
      .get('/api/me')
      .set('Cookie', [`sap_access=${expiredToken}`]);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error).toBe('UNAUTHENTICATED');

    // 3. Tampered token
    const tamperedToken = `${expiredToken.slice(0, -4)}xxxx`;
    const tamperedRes = await request(app)
      .get('/api/me')
      .set('Cookie', [`sap_access=${tamperedToken}`]);
    expect(tamperedRes.status).toBe(401);
    expect(tamperedRes.body.error).toBe('UNAUTHENTICATED');
  });

  it('authenticates via POST /api/auth/login, sets httpOnly cookies, and returns user via GET /api/me', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student1@sau.int', password: DEV_PASSWORDS.student });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toEqual({
      id: SEED_IDS.studentId(1),
      email: 'student1@sau.int',
      fullName: 'Student 1',
      role: 'STUDENT',
    });
    // Never return JWTs or password hashes in body
    expect(loginRes.body.accessToken).toBeUndefined();
    expect(loginRes.body.user.password_hash).toBeUndefined();

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('sap_access=') && c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('sap_refresh=') && c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('sap_csrf='))).toBe(true);

    const meRes = await request(app).get('/api/me').set('Cookie', cookies);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe('STUDENT');
  });

  it('enforces CSRF protection on state-changing routes and allows requests with matching X-CSRF-Token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student1@sau.int', password: DEV_PASSWORDS.student });
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const csrfToken = extractCookieValue(cookies, 'sap_csrf')!;

    // Missing X-CSRF-Token header -> 403 FORBIDDEN
    const missingCsrfRes = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(missingCsrfRes.status).toBe(403);
    expect(missingCsrfRes.body.error).toBe('FORBIDDEN');

    // Valid X-CSRF-Token header -> 200 OK
    const validCsrfRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken);
    expect(validCsrfRes.status).toBe(200);
  });

  it('rotates refresh tokens on POST /api/auth/refresh and revokes entire family on token reuse', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prof.sharma@sau.int', password: DEV_PASSWORDS.professor });
    const initialCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const initialCsrf = extractCookieValue(initialCookies, 'sap_csrf')!;

    // First refresh succeeds and issues new refresh token
    const refresh1 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', initialCookies)
      .set('X-CSRF-Token', initialCsrf);
    expect(refresh1.status).toBe(200);

    const rotatedCookies = refresh1.headers['set-cookie'] as unknown as string[];
    const rotatedCsrf = extractCookieValue(rotatedCookies, 'sap_csrf')!;

    // Reusing the OLD refresh token triggers reuse detection -> 401 and revokes the family
    const reuseAttempt = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', initialCookies)
      .set('X-CSRF-Token', initialCsrf);
    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.error).toBe('UNAUTHENTICATED');

    // Now even the rotated token in that family is revoked -> 401
    const rotatedAttemptAfterBreach = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', rotatedCookies)
      .set('X-CSRF-Token', rotatedCsrf);
    expect(rotatedAttemptAfterBreach.status).toBe(401);
  });
});