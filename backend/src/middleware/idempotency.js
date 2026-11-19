import { createHash } from 'node:crypto';
import { canonicalJson } from '../audit/audit.writer.js';
import { AppError } from './errorHandler.js';

export function requireIdempotencyKey(req) {
  const key = req.header('Idempotency-Key')?.trim();
  if (!key || key.length === 0 || key.length > 128) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Valid Idempotency-Key header (1-128 chars) is required for this operation.'
    );
  }
  return key;
}

export function hashRequestPayload(body, params) {
  return createHash('sha256')
    .update(canonicalJson({ params: params ?? {}, body: body ?? {} }))
    .digest('hex');
}

export async function executeWithIdempotency(client, params, work) {
  await client.query(
    `INSERT INTO idempotency_keys (user_id, route, idempotency_key, request_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, route, idempotency_key) DO NOTHING`,
    [params.userId, params.route, params.idempotencyKey, params.requestHash]
  );

  const { rows } = await client.query(
    `SELECT request_hash, status_code, response_body
     FROM idempotency_keys
     WHERE user_id = $1 AND route = $2 AND idempotency_key = $3
     FOR UPDATE`,
    [params.userId, params.route, params.idempotencyKey]
  );

  const record = rows[0];
  if (record.request_hash !== params.requestHash) {
    throw new AppError(
      422,
      'IDEMPOTENCY_KEY_REUSED',
      'Idempotency-Key was already used with a different request payload.'
    );
  }

  if (record.status_code !== null && record.response_body !== null) {
    return { statusCode: record.status_code, body: record.response_body, replayed: true };
  }

  const result = await work();

  await client.query(
    `UPDATE idempotency_keys
     SET status_code = $4, response_body = $5
     WHERE user_id = $1 AND route = $2 AND idempotency_key = $3`,
    [
      params.userId,
      params.route,
      params.idempotencyKey,
      result.statusCode,
      JSON.stringify(result.body),
    ]
  );

  return { statusCode: result.statusCode, body: result.body, replayed: false };
}