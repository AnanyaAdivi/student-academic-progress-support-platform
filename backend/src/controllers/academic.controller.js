import { academicService } from '../services/academic.service.js';
import { hashRequestPayload } from '../middleware/idempotency.js';

export const academicController = {
  async getStudentProgress(req, res, next) {
    try {
      const progress = await academicService.getStudentProgress(
        req.user,
        req.params.id,
        req.query.asOf
      );
      res.status(200).json(progress);
    } catch (err) {
      next(err);
    }
  },

  async createGrade(req, res, next) {
    try {
      const grade = await academicService.createGrade(req.user, req.params.id, req.body);
      res.status(201).json({ grade });
    } catch (err) {
      next(err);
    }
  },

  async correctGrade(req, res, next) {
    try {
      const grade = await academicService.correctGrade(req.user, req.params.id, req.body);
      res.status(201).json({ grade });
    } catch (err) {
      next(err);
    }
  },

  async importGrades(req, res, next) {
    try {
      const idempotencyKey = req.get('Idempotency-Key') || null;
      const requestHash = idempotencyKey ? hashRequestPayload(req.body, req.params) : null;
      const result = await academicService.importGrades(req.user, req.body, {
        idempotencyKey,
        requestHash,
      });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      next(err);
    }
  },

  async getStudentHistory(req, res, next) {
    try {
      const history = await academicService.getStudentHistory(req.user, req.params.id);
      res.status(200).json({ studentId: req.params.id, events: history });
    } catch (err) {
      next(err);
    }
  },
};
