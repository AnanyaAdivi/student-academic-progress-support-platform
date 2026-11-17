import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { computeAuditHash, GENESIS_HASH } from '../../audit/audit.writer.js';

const BCRYPT_ROUNDS = 12;

export const SEED_IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  prof1: '00000000-0000-4000-8000-000000000101',
  prof2: '00000000-0000-4000-8000-000000000102',
  prof3: '00000000-0000-4000-8000-000000000103',
  studentId: (n) => `00000000-0000-4000-8000-${String(1000 + n).padStart(12, '0')}`,
  courseCs201: '00000000-0000-4000-8000-000000000201',
  courseCs205: '00000000-0000-4000-8000-000000000205',
  courseCs301: '00000000-0000-4000-8000-000000000301',
  offeringSem2: '00000000-0000-4000-8000-000000000402',
  offeringSem3: '00000000-0000-4000-8000-000000000403',
  offeringSem4: '00000000-0000-4000-8000-000000000404',
  assessSem2Final: '00000000-0000-4000-8000-000000000502',
  assessSem3Final: '00000000-0000-4000-8000-000000000503',
  assessSem4Mid: '00000000-0000-4000-8000-000000000504',
  assessSem4Fin: '00000000-0000-4000-8000-000000000505',
  slotOpen1: '00000000-0000-4000-8000-000000000601',
  slotOpen2: '00000000-0000-4000-8000-000000000602',
  slotOpen3: '00000000-0000-4000-8000-000000000603',
};

export const DEV_PASSWORDS = {
  admin: 'AdminPass123!',
  professor: 'ProfPass123!',
  student: 'StudentPass123!',
};

export async function runSeeds() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run development seeds in production environment.');
  }

  const seedPool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL });
  const client = await seedPool.connect();

  try {
    await client.query('BEGIN');

    await client.query('ALTER TABLE audit_events DISABLE TRIGGER trg_audit_events_immutable');
    await client.query('ALTER TABLE grade_versions DISABLE TRIGGER trg_grade_versions_immutable');

    await client.query(`
      TRUNCATE TABLE
        idempotency_keys, notifications, audit_events, grade_versions,
        assessments, support_requests, support_slots, enrollments,
        course_offerings, courses, refresh_tokens, users
      RESTART IDENTITY CASCADE;
    `);

    await client.query('ALTER TABLE audit_events ENABLE TRIGGER trg_audit_events_immutable');
    await client.query('ALTER TABLE grade_versions ENABLE TRIGGER trg_grade_versions_immutable');

    const [adminHash, profHash, studentHash] = await Promise.all([
      bcrypt.hash(DEV_PASSWORDS.admin, BCRYPT_ROUNDS),
      bcrypt.hash(DEV_PASSWORDS.professor, BCRYPT_ROUNDS),
      bcrypt.hash(DEV_PASSWORDS.student, BCRYPT_ROUNDS),
    ]);

    await client.query(
      `INSERT INTO users (id, email, full_name, password_hash, role) VALUES
        ($1, 'admin@sau.int', 'SAU System Admin', $2, 'ADMIN'),
        ($3, 'prof.sharma@sau.int', 'Dr. A. Sharma', $4, 'PROFESSOR'),
        ($5, 'prof.khan@sau.int', 'Dr. R. Khan', $4, 'PROFESSOR'),
        ($6, 'prof.iyer@sau.int', 'Dr. M. Iyer', $4, 'PROFESSOR')`,
      [SEED_IDS.admin, adminHash, SEED_IDS.prof1, profHash, SEED_IDS.prof2, SEED_IDS.prof3]
    );

    for (let i = 1; i <= 50; i++) {
      await client.query(
        `INSERT INTO users (id, email, full_name, password_hash, role)
         VALUES ($1, $2, $3, $4, 'STUDENT')`,
        [SEED_IDS.studentId(i), `student${i}@sau.int`, `Student ${i}`, studentHash]
      );
    }

    await client.query(
      `INSERT INTO courses (id, code, title, credits) VALUES
        ($1, 'CS 201', 'Discrete Mathematics', 4),
        ($2, 'CS 205', 'Computer Networks', 4),
        ($3, 'CS 301', 'Data Structures & Algorithms', 4)`,
      [SEED_IDS.courseCs201, SEED_IDS.courseCs205, SEED_IDS.courseCs301]
    );

    await client.query(
      `INSERT INTO course_offerings (id, course_id, professor_id, semester_number, semester_term, start_date, end_date) VALUES
        ($1, $2, $3, 2, 'Spring 2025', '2025-01-15', '2025-05-31'),
        ($4, $5, $6, 3, 'Autumn 2025', '2025-08-01', '2025-12-15'),
        ($7, $8, $3, 4, 'Spring 2026', '2026-01-15', '2026-05-31')`,
      [
        SEED_IDS.offeringSem2, SEED_IDS.courseCs201, SEED_IDS.prof1,
        SEED_IDS.offeringSem3, SEED_IDS.courseCs205, SEED_IDS.prof2,
        SEED_IDS.offeringSem4, SEED_IDS.courseCs301,
      ]
    );

    await client.query(
      `INSERT INTO enrollments (student_id, offering_id) VALUES ($1, $2), ($1, $3)`,
      [SEED_IDS.studentId(1), SEED_IDS.offeringSem2, SEED_IDS.offeringSem3]
    );
    for (let i = 1; i <= 50; i++) {
      await client.query(
        `INSERT INTO enrollments (student_id, offering_id) VALUES ($1, $2)`,
        [SEED_IDS.studentId(i), SEED_IDS.offeringSem4]
      );
    }

    await client.query(
      `INSERT INTO assessments (id, offering_id, name, max_score, weight_pct) VALUES
        ($1, $2, 'Comprehensive Exam', 100, 100),
        ($3, $4, 'Comprehensive Exam', 100, 100),
        ($5, $6, 'Midterm Exam', 100, 40),
        ($7, $6, 'Final Project & Exam', 100, 60)`,
      [
        SEED_IDS.assessSem2Final, SEED_IDS.offeringSem2,
        SEED_IDS.assessSem3Final, SEED_IDS.offeringSem3,
        SEED_IDS.assessSem4Mid, SEED_IDS.offeringSem4,
        SEED_IDS.assessSem4Fin,
      ]
    );

    const v1GradeId = '00000000-0000-4000-8000-000000000701';
    const v2GradeId = '00000000-0000-4000-8000-000000000702';

    await client.query(
      `INSERT INTO grade_versions (id, assessment_id, student_id, version_no, score, reason, supersedes_id, recorded_by, effective_at, recorded_at)
       VALUES
        ('00000000-0000-4000-8000-000000000700', $1, $2, 1, 82, NULL, NULL, $3, '2025-05-20T10:00:00Z', '2025-05-20T10:00:00Z'),
        ('00000000-0000-4000-8000-000000000703', $4, $2, 1, 78, NULL, NULL, $5, '2025-12-10T10:00:00Z', '2025-12-10T10:00:00Z'),
        ($6, $7, $2, 1, 80, NULL, NULL, $3, '2026-03-15T10:00:00Z', '2026-03-15T10:00:00Z'),
        ($8, $7, $2, 2, 88, 'Re-evaluated Q4 graph traversal proof', $6, $3, '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z'),
        ('00000000-0000-4000-8000-000000000704', $9, $2, 1, 88, NULL, NULL, $3, '2026-05-20T10:00:00Z', '2026-05-20T10:00:00Z')`,
      [
        SEED_IDS.assessSem2Final, SEED_IDS.studentId(1), SEED_IDS.prof1,
        SEED_IDS.assessSem3Final, SEED_IDS.prof2,
        v1GradeId, SEED_IDS.assessSem4Mid, v2GradeId, SEED_IDS.assessSem4Fin,
      ]
    );

    await client.query(
      `INSERT INTO support_slots (id, professor_id, start_time, end_time, capacity, status) VALUES
        ($1, $4, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 30 minutes', 1, 'OPEN'),
        ($2, $4, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 30 minutes', 1, 'OPEN'),
        ($3, $5, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 30 minutes', 1, 'OPEN')`,
      [SEED_IDS.slotOpen1, SEED_IDS.slotOpen2, SEED_IDS.slotOpen3, SEED_IDS.prof1, SEED_IDS.prof2]
    );

    const ts1 = new Date('2026-03-15T10:00:00.000Z').toISOString();
    const evt1Payload = { assessmentId: SEED_IDS.assessSem4Mid, versionNo: 1, score: 80 };
    const evt1Envelope = {
      actorId: SEED_IDS.prof1,
      targetStudentId: SEED_IDS.studentId(1),
      eventType: 'GRADE_CREATED',
      entityType: 'GRADE_VERSION',
      entityId: v1GradeId,
      payload: evt1Payload,
    };
    const hash1 = computeAuditHash(GENESIS_HASH, evt1Envelope, 1, ts1);

    await client.query(
      `INSERT INTO audit_events (seq, actor_id, target_student_id, event_type, entity_type, entity_id, payload, recorded_at, prev_hash, hash)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        evt1Envelope.actorId, evt1Envelope.targetStudentId, evt1Envelope.eventType,
        evt1Envelope.entityType, evt1Envelope.entityId, JSON.stringify(evt1Payload),
        ts1, GENESIS_HASH, hash1,
      ]
    );

    const ts2 = new Date('2026-04-01T10:00:00.000Z').toISOString();
    const evt2Payload = {
      assessmentId: SEED_IDS.assessSem4Mid,
      versionNo: 2,
      score: 88,
      reason: 'Re-evaluated Q4 graph traversal proof',
      supersedesId: v1GradeId,
    };
    const evt2Envelope = {
      actorId: SEED_IDS.prof1,
      targetStudentId: SEED_IDS.studentId(1),
      eventType: 'GRADE_CORRECTED',
      entityType: 'GRADE_VERSION',
      entityId: v2GradeId,
      payload: evt2Payload,
    };
    const hash2 = computeAuditHash(hash1, evt2Envelope, 2, ts2);

    await client.query(
      `INSERT INTO audit_events (seq, actor_id, target_student_id, event_type, entity_type, entity_id, payload, recorded_at, prev_hash, hash)
       VALUES (2, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        evt2Envelope.actorId, evt2Envelope.targetStudentId, evt2Envelope.eventType,
        evt2Envelope.entityType, evt2Envelope.entityId, JSON.stringify(evt2Payload),
        ts2, hash1, hash2,
      ]
    );

    await client.query(`SELECT setval('audit_events_seq_seq', 2, true)`);
    await client.query('COMMIT');
    logger.info('Development seed data applied (1 admin, 3 professors, 50 students, 3 semesters)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await seedPool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Seed failed');
      process.exit(1);
    });
}