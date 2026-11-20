import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { runSeeds, DEV_PASSWORDS } from '../src/db/seeds/seed.js';
import { app, loginAs, withCsrf, extractCsrfToken } from './helpers/testClient.js';

const CREDS = {
  student1: { email: 'student1@sau.int', password: DEV_PASSWORDS.student },
  student2: { email: 'student2@sau.int', password: DEV_PASSWORDS.student },
  prof1: { email: 'prof.sharma@sau.int', password: DEV_PASSWORDS.professor },
  admin: { email: 'admin@sau.int', password: DEV_PASSWORDS.admin },
};

beforeAll(async () => {
  await runSeeds();
});

describe('1. Health & Auth Lifecycle', () => {
  it('GET /api/health returns 200 and db: up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
  });

  it('logs in, fetches /api/me, rotates refresh token, and logs out', async () => {
    const { agent, csrfToken, user } = await loginAs(CREDS.student1.email, CREDS.student1.password);
    expect(user.email).toBe(CREDS.student1.email);

    const meRes = await agent.get('/api/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(user.id);

    const refreshRes = await withCsrf(agent.post('/api/auth/refresh'), csrfToken);
    expect(refreshRes.status).toBe(200);

    const nextCsrf = extractCsrfToken(refreshRes.headers['set-cookie'] || []) || csrfToken;
    const logoutRes = await withCsrf(agent.post('/api/auth/logout'), nextCsrf);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await agent.get('/api/me');
    expect(afterLogout.status).toBe(401);
  });
});

describe('2. RBAC & IDOR Protection', () => {
  it('blocks a student from accessing another student’s academic progress', async () => {
    const s1 = await loginAs(CREDS.student1.email, CREDS.student1.password);
    const s2 = await loginAs(CREDS.student2.email, CREDS.student2.password);

    const res = await s1.agent.get(`/api/students/${s2.user.id}/progress`);
    expect([403, 404]).toContain(res.status);
  });

  it('blocks a student from calling admin audit verification', async () => {
    const s1 = await loginAs(CREDS.student1.email, CREDS.student1.password);
    const res = await s1.agent.get('/api/admin/audit/verify');
    expect(res.status).toBe(403);
  });
});

describe('3. Support Workflow & Idempotency', () => {
  it('creates a slot, replays an idempotent booking request, and rejects payload mismatch', async () => {
    const prof = await loginAs(CREDS.prof1.email, CREDS.prof1.password);
    const student = await loginAs(CREDS.student1.email, CREDS.student1.password);

    // Offset by 10 days to avoid overlapping prof.sharma's seeded slots (+2d and +3d)
    const startTime = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    const endTime = new Date(Date.now() + (10 * 24 + 1) * 3600 * 1000).toISOString();

    const slotRes = await withCsrf(prof.agent.post('/api/slots'), prof.csrfToken).send({
      startTime,
      endTime,
    });
    expect([200, 201]).toContain(slotRes.status);
    const slotId = slotRes.body.slot?.id ?? slotRes.body.data?.id ?? slotRes.body.id;
    expect(slotId).toBeTruthy();

    const idemKey = `idem-${crypto.randomUUID()}`;
    const payloadA = { topic: 'Algorithms Midterm Prep' };
    const payloadB = { topic: 'Different Topic Payload' };

    const first = await withCsrf(student.agent.post(`/api/slots/${slotId}/requests`), student.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send(payloadA);
    expect([200, 201]).toContain(first.status);

    const replay = await withCsrf(student.agent.post(`/api/slots/${slotId}/requests`), student.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send(payloadA);
    expect(replay.status).toBe(first.status);
    expect(replay.body).toEqual(first.body);

    const mismatch = await withCsrf(student.agent.post(`/api/slots/${slotId}/requests`), student.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send(payloadB);
    expect([409, 422]).toContain(mismatch.status);
  });
});

describe('4. Academic Point-in-Time (asOf) & Audit Chain Integrity', () => {
  it('returns point-in-time progress for student1 before and after grade correction', async () => {
    const student = await loginAs(CREDS.student1.email, CREDS.student1.password);

    const beforeRes = await student.agent.get(
      `/api/students/${student.user.id}/progress?asOf=${encodeURIComponent('2026-03-20T00:00:00.000Z')}`
    );
    expect(beforeRes.status).toBe(200);

    const afterRes = await student.agent.get(
      `/api/students/${student.user.id}/progress?asOf=${encodeURIComponent('2026-04-15T00:00:00.000Z')}`
    );
    expect(afterRes.status).toBe(200);
  });

  it('verifies audit log hash chain as valid for admin', async () => {
    const admin = await loginAs(CREDS.admin.email, CREDS.admin.password);
    const res = await admin.agent.get('/api/admin/audit/verify');
    expect(res.status).toBe(200);
    expect(res.body.valid ?? res.body.ok).toBe(true);
  });
});
