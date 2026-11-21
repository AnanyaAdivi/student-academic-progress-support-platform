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

describe('5. Admin Users, Professor Requests & Bulk Grade Import', () => {
  it('returns registered users for admin without password hashes and blocks non-admins', async () => {
    const admin = await loginAs(CREDS.admin.email, CREDS.admin.password);
    const student = await loginAs(CREDS.student1.email, CREDS.student1.password);

    const forbiddenRes = await student.agent.get('/api/admin/users');
    expect(forbiddenRes.status).toBe(403);

    const usersRes = await admin.agent.get('/api/admin/users');
    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body)).toBe(true);
    expect(usersRes.body.length).toBeGreaterThanOrEqual(4);

    const emails = usersRes.body.map((u) => u.email);
    expect(emails).toContain(CREDS.student1.email);
    expect(emails).toContain(CREDS.prof1.email);
    expect(emails).toContain(CREDS.admin.email);
    for (const u of usersRes.body) {
      expect(u.id).toBeTruthy();
      expect(u.name).toBeTruthy();
      expect(u.role).toBeTruthy();
      expect(u.passwordHash).toBeUndefined();
      expect(u.password_hash).toBeUndefined();
    }

    const verifyRes = await admin.agent.get('/api/admin/audit/verify');
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.checkedEvents).toBeGreaterThan(0);
    expect(verifyRes.body.firstBrokenRow).toBeNull();
    expect(verifyRes.body.verifiedAt).toBeTruthy();
  });

  it('allows professors to view incoming requests for their slots via GET /api/requests?mine=true', async () => {
    const prof = await loginAs(CREDS.prof1.email, CREDS.prof1.password);
    const student = await loginAs(CREDS.student2.email, CREDS.student2.password);

    const startTime = new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString();
    const endTime = new Date(Date.now() + (12 * 24 + 1) * 3600 * 1000).toISOString();

    const slotRes = await withCsrf(prof.agent.post('/api/slots'), prof.csrfToken).send({
      startTime,
      endTime,
    });
    expect(slotRes.status).toBe(201);
    const slotId = slotRes.body.slot.id;

    const reqRes = await withCsrf(
      student.agent.post(`/api/slots/${slotId}/requests`),
      student.csrfToken
    )
      .set('Idempotency-Key', `idem-${crypto.randomUUID()}`)
      .send({ topic: 'Dynamic Programming Doubt' });
    expect(reqRes.status).toBe(201);
    const createdReqId = reqRes.body.request.id;

    const profListRes = await prof.agent.get('/api/requests?mine=true');
    expect(profListRes.status).toBe(200);
    expect(Array.isArray(profListRes.body.requests)).toBe(true);
    const matched = profListRes.body.requests.find((r) => r.id === createdReqId);
    expect(matched).toBeTruthy();
    expect(matched.topic).toBe('Dynamic Programming Doubt');
    expect(matched.studentName).toBeTruthy();
  });

  it('imports grades in bulk with idempotency, versioned corrections, and valid audit chain', async () => {
    const prof = await loginAs(CREDS.prof1.email, CREDS.prof1.password);
    const student = await loginAs(CREDS.student1.email, CREDS.student1.password);
    const admin = await loginAs(CREDS.admin.email, CREDS.admin.password);

    const payloadV1 = {
      courseCode: 'CS 310',
      courseName: 'Software Engineering',
      assessmentName: 'Midterm',
      professorId: prof.user.id,
      rows: [
        { rowNumber: 2, studentId: 'SAU24001', studentName: 'Student One', score: 42, maxScore: 50 },
        { rowNumber: 3, studentId: 'SAU24002', studentName: 'Student Two', score: 38, maxScore: 50 },
      ],
    };

    const blockedRes = await withCsrf(
      student.agent.post('/api/grades/import'),
      student.csrfToken
    ).send(payloadV1);
    expect(blockedRes.status).toBe(403);

    const idemKey = `import-${crypto.randomUUID()}`;
    const firstImport = await withCsrf(prof.agent.post('/api/grades/import'), prof.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send(payloadV1);
    expect(firstImport.status).toBe(201);
    expect(firstImport.body.imported).toBe(2);
    expect(firstImport.body.created).toBe(2);
    expect(firstImport.body.corrected).toBe(0);
    expect(firstImport.body.grades[0].versionNo).toBe(1);

    // Idempotent replay returns identical result without creating duplicate versions
    const replayImport = await withCsrf(prof.agent.post('/api/grades/import'), prof.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send(payloadV1);
    expect(replayImport.status).toBe(201);
    expect(replayImport.body).toEqual(firstImport.body);

    // Re-importing with updated marks creates v2 superseding v1 instead of overwriting
    const v1GradeId = firstImport.body.grades[0].id;
    const correctionImport = await withCsrf(prof.agent.post('/api/grades/import'), prof.csrfToken)
      .set('Idempotency-Key', `import-${crypto.randomUUID()}`)
      .send({
        ...payloadV1,
        rows: [
          { rowNumber: 2, studentId: 'SAU24001', studentName: 'Student One', score: 46, maxScore: 50 },
        ],
      });
    expect(correctionImport.status).toBe(201);
    expect(correctionImport.body.imported).toBe(1);
    expect(correctionImport.body.created).toBe(0);
    expect(correctionImport.body.corrected).toBe(1);
    expect(correctionImport.body.grades[0].versionNo).toBe(2);
    expect(correctionImport.body.grades[0].supersedesId).toBe(v1GradeId);

    const verifyAfter = await admin.agent.get('/api/admin/audit/verify');
    expect(verifyAfter.status).toBe(200);
    expect(verifyAfter.body.valid).toBe(true);
  });
});
