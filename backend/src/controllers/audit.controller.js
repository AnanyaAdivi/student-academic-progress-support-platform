import { verifyAuditChain } from '../audit/audit.verifier.js';

export const auditController = {
  async verify(_req, res, next) {
    try {
      const report = await verifyAuditChain();
      res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  },
};