import { pool } from '../db/pool.js';
import { verifyAuditChain } from '../audit/audit.verifier.js';

export const auditController = {
  async listUsers(_req, res, next) {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, full_name, role, created_at
         FROM users
         ORDER BY role ASC, full_name ASC`
      );
      const users = rows.map((row) => ({
        id: row.id,
        name: row.full_name,
        fullName: row.full_name,
        email: row.email,
        role: row.role,
        active: true,
        joined: row.created_at ? row.created_at.toISOString().slice(0, 10) : null,
      }));
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  },

  async verify(_req, res, next) {
    try {
      const report = await verifyAuditChain();
      res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  },
};
