import { pool } from '../db/pool.js';
import { computeAuditHash, GENESIS_HASH } from './audit.writer.js';

export async function verifyAuditChain() {
  const { rows } = await pool.query(
    `SELECT seq, id, actor_id, target_student_id, event_type, entity_type, entity_id,
            payload, recorded_at, prev_hash, hash
     FROM audit_events
     ORDER BY seq ASC`
  );

  let expectedPrevHash = GENESIS_HASH;

  for (const row of rows) {
    const seq = Number(row.seq);
    if (row.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        totalEvents: rows.length,
        firstBrokenSeq: seq,
        reason: 'prev_hash mismatch',
      };
    }

    const envelope = {
      actorId: row.actor_id,
      targetStudentId: row.target_student_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: row.payload,
    };

    const expectedHash = computeAuditHash(
      row.prev_hash,
      envelope,
      seq,
      row.recorded_at.toISOString()
    );

    if (row.hash !== expectedHash) {
      return {
        valid: false,
        totalEvents: rows.length,
        firstBrokenSeq: seq,
        reason: 'hash mismatch (tampered payload or metadata)',
      };
    }

    expectedPrevHash = row.hash;
  }

  return {
    valid: true,
    totalEvents: rows.length,
    headHash: expectedPrevHash,
    firstBrokenSeq: null,
  };
}