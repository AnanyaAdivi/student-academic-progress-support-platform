import { pool } from '../db/pool.js';

export const supportRepository = {
  async listSlots({ role, actorId, professorId, from, to }) {
    const conditions = [];
    const values = [];

    if (role === 'STUDENT') {
      conditions.push(`s.status = 'OPEN'`);
      if (professorId) {
        values.push(professorId);
        conditions.push(`s.professor_id = $${values.length}`);
      }
    } else if (role === 'PROFESSOR') {
      values.push(actorId);
      conditions.push(`s.professor_id = $${values.length}`);
    } else if (professorId) {
      values.push(professorId);
      conditions.push(`s.professor_id = $${values.length}`);
    }

    if (from) {
      values.push(from);
      conditions.push(`s.start_time >= $${values.length}::timestamptz`);
    }
    if (to) {
      values.push(to);
      conditions.push(`s.end_time <= $${values.length}::timestamptz`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT s.id, s.professor_id, u.full_name AS professor_name,
              s.start_time, s.end_time, s.capacity, s.status, s.created_at
       FROM support_slots s
       JOIN users u ON u.id = s.professor_id
       ${whereClause}
       ORDER BY s.start_time ASC`,
      values
    );
    return rows;
  },

  async createSlot(client, { professorId, startTime, endTime }) {
    const { rows } = await client.query(
      `INSERT INTO support_slots (professor_id, start_time, end_time, capacity, status)
       VALUES ($1, $2::timestamptz, $3::timestamptz, 1, 'OPEN')
       RETURNING id, professor_id, start_time, end_time, capacity, status, created_at`,
      [professorId, startTime, endTime]
    );
    return rows[0];
  },

  async lockSlotById(client, slotId) {
    const { rows } = await client.query(
      `SELECT id, professor_id, start_time, end_time, capacity, status, created_at
       FROM support_slots
       WHERE id = $1
       FOR UPDATE`,
      [slotId]
    );
    return rows[0] ?? null;
  },

  async hasConfirmedRequest(client, slotId) {
    const { rows } = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM support_requests WHERE slot_id = $1 AND status = 'CONFIRMED'
       ) AS exists`,
      [slotId]
    );
    return Boolean(rows[0]?.exists);
  },

  async cancelSlotAndMarkRequests(client, slotId) {
    await client.query(
      `UPDATE support_requests
       SET status = 'NEEDS_RESCHEDULE', updated_at = NOW()
       WHERE slot_id = $1 AND status = 'PENDING'`,
      [slotId]
    );
    await client.query(`UPDATE support_slots SET status = 'CANCELLED' WHERE id = $1`, [slotId]);
  },

  async createRequest(client, { slotId, studentId, topic, startTime, endTime }) {
    const rangeStr = `[${startTime.toISOString()},${endTime.toISOString()})`;
    const { rows } = await client.query(
      `INSERT INTO support_requests (slot_id, student_id, topic, status, time_range)
       VALUES ($1, $2, $3, 'PENDING', $4::tstzrange)
       RETURNING id, slot_id, student_id, topic, status, created_at, updated_at`,
      [slotId, studentId, topic, rangeStr]
    );
    return { ...rows[0], start_time: startTime, end_time: endTime };
  },

  async listStudentRequests(studentId) {
    const { rows } = await pool.query(
      `SELECT r.id, r.slot_id, r.student_id, r.topic, r.status, r.created_at, r.updated_at,
              s.professor_id, u.full_name AS professor_name, s.start_time, s.end_time
       FROM support_requests r
       JOIN support_slots s ON s.id = r.slot_id
       JOIN users u ON u.id = s.professor_id
       WHERE r.student_id = $1
       ORDER BY r.created_at DESC`,
      [studentId]
    );
    return rows;
  },

  async findRequestById(client, requestId, forUpdate = false) {
    const lockClause = forUpdate ? 'FOR UPDATE OF r' : '';
    const { rows } = await client.query(
      `SELECT r.id, r.slot_id, r.student_id, r.topic, r.status, r.created_at, r.updated_at,
              s.professor_id AS slot_professor_id, s.start_time, s.end_time
       FROM support_requests r
       JOIN support_slots s ON s.id = r.slot_id
       WHERE r.id = $1
       ${lockClause}`,
      [requestId]
    );
    return rows[0] ?? null;
  },

  async updateRequestStatusIfPending(client, requestId, newStatus) {
    const { rows } = await client.query(
      `UPDATE support_requests
       SET status = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING id, slot_id, student_id, topic, status, created_at, updated_at`,
      [requestId, newStatus]
    );
    return rows[0] ?? null;
  },

  async markOtherPendingRequestsNeedsReschedule(client, slotId, confirmedRequestId) {
    const { rows } = await client.query(
      `UPDATE support_requests
       SET status = 'NEEDS_RESCHEDULE', updated_at = NOW()
       WHERE slot_id = $1 AND id <> $2 AND status = 'PENDING'
       RETURNING student_id`,
      [slotId, confirmedRequestId]
    );
    return rows.map((r) => r.student_id);
  },

  async closeSlot(client, slotId) {
    await client.query(`UPDATE support_slots SET status = 'CLOSED' WHERE id = $1`, [slotId]);
  },

  async moveRequestToSlot(client, { requestId, newSlotId, startTime, endTime }) {
    const rangeStr = `[${startTime.toISOString()},${endTime.toISOString()})`;
    const { rows } = await client.query(
      `UPDATE support_requests
       SET slot_id = $2, time_range = $3::tstzrange, status = 'PENDING', updated_at = NOW()
       WHERE id = $1 AND status IN ('PENDING', 'NEEDS_RESCHEDULE')
       RETURNING id, slot_id, student_id, topic, status, created_at, updated_at`,
      [requestId, newSlotId, rangeStr]
    );
    return rows[0] ?? null;
  },

  async findSuggestedAlternativeSlots(client, professorId, excludeSlotId) {
    const { rows } = await client.query(
      `SELECT id FROM support_slots
       WHERE professor_id = $1 AND id <> $2 AND status = 'OPEN' AND start_time > NOW()
       ORDER BY start_time ASC
       LIMIT 3`,
      [professorId, excludeSlotId]
    );
    return rows.map((r) => r.id);
  },

  async insertNotification(client, { userId, type, message, metadata }) {
    await client.query(
      `INSERT INTO notifications (user_id, type, message, metadata)
       VALUES ($1, $2, $3, $4)`,
      [userId, type, message, JSON.stringify(metadata)]
    );
  },
};