import { supportService } from '../services/support.service.js';
import { hashRequestPayload, requireIdempotencyKey } from '../middleware/idempotency.js';

export const supportController = {
  async listSlots(req, res, next) {
    try {
      const slots = await supportService.listSlots(req.user, req.query);
      res.status(200).json({ slots });
    } catch (err) {
      next(err);
    }
  },

  async createSlot(req, res, next) {
    try {
      const slot = await supportService.createSlot(req.user, req.body);
      res.status(201).json({ slot });
    } catch (err) {
      next(err);
    }
  },

  async deleteSlot(req, res, next) {
    try {
      await supportService.deleteSlot(req.user, req.params.id);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  async createRequest(req, res, next) {
    try {
      const idempotencyKey = requireIdempotencyKey(req);
      const requestHash = hashRequestPayload(req.body, req.params);
      const result = await supportService.createSupportRequest(req.user, {
        slotId: req.params.id,
        topic: req.body.topic,
        idempotencyKey,
        requestHash,
      });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      next(err);
    }
  },

  async listMyRequests(req, res, next) {
    try {
      const requests = await supportService.listMyRequests(req.user);
      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  },

  async cancelRequest(req, res, next) {
    try {
      const request = await supportService.cancelRequest(req.user, req.params.id);
      res.status(200).json({ request });
    } catch (err) {
      next(err);
    }
  },

  async confirmRequest(req, res, next) {
    try {
      const idempotencyKey = requireIdempotencyKey(req);
      const requestHash = hashRequestPayload(req.body, req.params);
      const result = await supportService.confirmRequest(req.user, {
        requestId: req.params.id,
        idempotencyKey,
        requestHash,
      });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      next(err);
    }
  },

  async rescheduleRequest(req, res, next) {
    try {
      const targetSlotId = req.body.newSlotId || req.body.slotId;
      const request = await supportService.rescheduleRequest(
        req.user,
        req.params.id,
        targetSlotId
      );
      res.status(200).json({ request });
    } catch (err) {
      next(err);
    }
  },
};
