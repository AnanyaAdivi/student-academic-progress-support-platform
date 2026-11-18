import { pool } from '../db/pool.js';

export const authRepository = {
  async findUserByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, password_hash, role
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return rows[0] ?? null;
  },

  async findUserById(id) {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, role FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async insertRefreshToken({ userId, tokenHash, familyId, expiresAt }) {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, tokenHash, familyId, expiresAt]
    );
  },

  async findRefreshTokenByHash(tokenHash) {
    const { rows } = await pool.query(
      `SELECT id, user_id, token_hash, family_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async revokeRefreshTokenById(id) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
      [id]
    );
  },

  async revokeRefreshTokenFamily(familyId) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId]
    );
  },
};