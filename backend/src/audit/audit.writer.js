import { createHash } from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);
const AUDIT_CHAIN_LOCK_ID = 9001001;

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

export function computeAuditHash(prevHash, eventEnvelope, seq, timestampIso) {
  const preimage = `${prevHash}|${canonicalJson(eventEnvelope)}|${String(seq)}|${timestampIso}`;
  return createHash('sha256').update(preimage).digest('hex');
}

export async function appendAuditEvent(client, params) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [AUDIT_CHAIN_LOCK_ID]);

  const headRes = await client.query(
    'SELECT hash FROM audit_events ORDER BY seq DESC LIMIT 1'
  );
  const prevHash = headRes.rows[0]?.hash ?? GENESIS_HASH;

  const seqRes = await client.query(`SELECT nextval('audit_events_seq_seq')::text AS next_seq`);
  const nextSeq = Number(seqRes.rows[0].next_seq);
  const recordedAtIso = new Date().toISOString();

  const envelope = {
    actorId: params.actorId,
    targetStudentId: params.targetStudentId,
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
  };

  const hash = computeAuditHash(prevHash, envelope, nextSeq, recordedAtIso);

  await client.query(
    `INSERT INTO audit_events (
       seq, actor_id, target_student_id, event_type, entity_type, entity_id, payload, recorded_at, prev_hash, hash
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      nextSeq,
      params.actorId,
      params.targetStudentId,
      params.eventType,
      params.entityType,
      params.entityId,
      JSON.stringify(params.payload),
      recordedAtIso,
      prevHash,
      hash,
    ]
  );

  return { seq: nextSeq, hash };
}