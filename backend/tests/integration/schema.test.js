import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runMigrations } from '../../src/db/migrate.js';
import { runSeeds, SEED_IDS } from '../../src/db/seeds/seed.js';
import { pool } from '../../src/db/pool.js';

describe('Phase 2: Database Schema, Invariants, Roles & Seeds', () => {
  beforeAll(async () => {
    await runMigrations();
    await runSeeds();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('seeds 1 admin, 3 professors, and 50 students', async () => {
    const { rows } = await pool.query<{ role: string; count: string }>(
      'SELECT role, COUNT(*)::text AS count FROM users GROUP BY role ORDER BY role'
    );
    expect(rows).toEqual([
      { role: 'ADMIN', count: '1' },
      { role: 'PROFESSOR', count: '3' },
      { role: 'STUDENT', count: '50' },
    ]);
  });

  it('rejects UPDATE and DELETE on audit_events and grade_versions when using app_rw', async () => {
    await expect(
      pool.query(`UPDATE audit_events SET event_type = 'TAMPERED' WHERE seq = 1`)
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      pool.query(`DELETE FROM audit_events WHERE seq = 1`)
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      pool.query(`UPDATE grade_versions SET score = 100`)
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      pool.query(`DELETE FROM grade_versions`)
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('enforces one_confirmed_request_per_slot partial unique index (PG 23505)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const slotRes = await client.query<{ start_time: Date; end_time: Date }>(
        'SELECT start_time, end_time FROM support_slots WHERE id = $1',
        [SEED_IDS.slotOpen1]
      );
      const { start_time, end_time } = slotRes.rows[0]!;
      const rangeStr = `[${start_time.toISOString()},${end_time.toISOString()})`;

      // Student 1 and Student 2 can both have PENDING requests for the same slot
      const r1 = await client.query<{ id: string }>(
        `INSERT INTO support_requests (slot_id, student_id, topic, status, time_range)
         VALUES ($1, $2, 'Topic 1', 'PENDING', $3::tstzrange) RETURNING id`,
        [SEED_IDS.slotOpen1, SEED_IDS.studentId(1), rangeStr]
      );
      const r2 = await client.query<{ id: string }>(
        `INSERT INTO support_requests (slot_id, student_id, topic, status, time_range)
         VALUES ($1, $2, 'Topic 2', 'PENDING', $3::tstzrange) RETURNING id`,
        [SEED_IDS.slotOpen1, SEED_IDS.studentId(2), rangeStr]
      );

      // Confirming the first succeeds
      await client.query(`UPDATE support_requests SET status = 'CONFIRMED' WHERE id = $1`, [
        r1.rows[0]!.id,
      ]);

      // Confirming the second on the same slot fails with 23505
      await expect(
        client.query(`UPDATE support_requests SET status = 'CONFIRMED' WHERE id = $1`, [
          r2.rows[0]!.id,
        ])
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('enforces GiST exclusion constraint against overlapping CONFIRMED sessions for same student (PG 23P01)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // slotOpen1 (Prof 1) and slotOpen3 (Prof 2) have identical overlapping time windows
      const slotRes = await client.query<{ start_time: Date; end_time: Date }>(
        'SELECT start_time, end_time FROM support_slots WHERE id = $1',
        [SEED_IDS.slotOpen1]
      );
      const { start_time, end_time } = slotRes.rows[0]!;
      const rangeStr = `[${start_time.toISOString()},${end_time.toISOString()})`;

      await client.query(
        `INSERT INTO support_requests (slot_id, student_id, topic, status, time_range)
         VALUES ($1, $2, 'Prof 1 Session', 'CONFIRMED', $3::tstzrange)`,
        [SEED_IDS.slotOpen1, SEED_IDS.studentId(3), rangeStr]
      );

      await expect(
        client.query(
          `INSERT INTO support_requests (slot_id, student_id, topic, status, time_range)
           VALUES ($1, $2, 'Overlapping Prof 2 Session', 'CONFIRMED', $3::tstzrange)`,
          [SEED_IDS.slotOpen3, SEED_IDS.studentId(3), rangeStr]
        )
      ).rejects.toMatchObject({ code: '23P01' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});