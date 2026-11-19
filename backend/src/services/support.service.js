import { pool } from '../db/pool.js';
import { appendAuditEvent } from '../audit/audit.writer.js';
import { toSlotDto, toSupportRequestDto } from '../dto/mappers.js';
import { AppError } from '../middleware/errorHandler.js';
import { executeWithIdempotency } from '../middleware/idempotency.js';
import { supportRepository } from '../repositories/support.repository.js';

export const supportService = {
  _testHookBeforeConfirmCommit: undefined,

  async listSlots(actor, query) {
    const rows = await supportRepository.listSlots({
      role: actor.role,
      actorId: actor.id,
      professorId: query.professorId,
      from: query.from,
      to: query.to,
    });
    return rows.map(toSlotDto);
  },

  async createSlot(actor, input) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can create support slots.');
    }
    if (new Date(input.startTime).getTime() <= Date.now()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Support slot startTime must be in the future.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const slot = await supportRepository.createSlot(client, {
        professorId: actor.id,
        startTime: input.startTime,
        endTime: input.endTime,
      });

      await appendAuditEvent(client, {
        actorId: actor.id,
        targetStudentId: null,
        eventType: 'SLOT_CREATED',
        entityType: 'SUPPORT_SLOT',
        entityId: slot.id,
        payload: {
          professorId: actor.id,
          startTime: slot.start_time.toISOString(),
          endTime: slot.end_time.toISOString(),
        },
      });

      await client.query('COMMIT');
      return toSlotDto(slot);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deleteSlot(actor, slotId) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can delete support slots.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const slot = await supportRepository.lockSlotById(client, slotId);
      if (!slot) throw new AppError(404, 'NOT_FOUND', 'Support slot not found.');
      if (slot.professor_id !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not own this support slot.');
      }

      if (await supportRepository.hasConfirmedRequest(client, slotId)) {
        throw new AppError(
          409,
          'SLOT_ALREADY_CONFIRMED',
          'Cannot delete a support slot that already has a confirmed request.'
        );
      }

      await supportRepository.cancelSlotAndMarkRequests(client, slotId);
      await appendAuditEvent(client, {
        actorId: actor.id,
        targetStudentId: null,
        eventType: 'SLOT_DELETED',
        entityType: 'SUPPORT_SLOT',
        entityId: slotId,
        payload: { slotId, status: 'CANCELLED' },
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async createSupportRequest(actor, { slotId, topic, idempotencyKey, requestHash }) {
    if (actor.role !== 'STUDENT') {
      throw new AppError(403, 'FORBIDDEN', 'Only students can submit support requests.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await executeWithIdempotency(
        client,
        {
          userId: actor.id,
          route: `POST:/api/slots/${slotId}/requests`,
          idempotencyKey,
          requestHash,
        },
        async () => {
          const slot = await supportRepository.lockSlotById(client, slotId);
          if (!slot) throw new AppError(404, 'NOT_FOUND', 'Support slot not found.');
          if (slot.status !== 'OPEN') {
            const alternatives = await supportRepository.findSuggestedAlternativeSlots(
              client,
              slot.professor_id,
              slot.id
            );
            throw new AppError(
              409,
              'SLOT_ALREADY_CONFIRMED',
              'This support slot is no longer open.',
              alternatives
            );
          }

          const created = await supportRepository.createRequest(client, {
            slotId: slot.id,
            studentId: actor.id,
            topic,
            startTime: slot.start_time,
            endTime: slot.end_time,
          });

          await appendAuditEvent(client, {
            actorId: actor.id,
            targetStudentId: actor.id,
            eventType: 'REQUEST_CREATED',
            entityType: 'SUPPORT_REQUEST',
            entityId: created.id,
            payload: { slotId: slot.id, studentId: actor.id, topic, status: 'PENDING' },
          });

          return { statusCode: 201, body: { request: toSupportRequestDto(created) } };
        }
      );

      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async listMyRequests(actor) {
    if (actor.role !== 'STUDENT') {
      throw new AppError(403, 'FORBIDDEN', 'Only students can view their own support requests.');
    }
    const rows = await supportRepository.listStudentRequests(actor.id);
    return rows.map(toSupportRequestDto);
  },

  async cancelRequest(actor, requestId) {
    if (actor.role !== 'STUDENT') {
      throw new AppError(403, 'FORBIDDEN', 'Only students can cancel their support requests.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await supportRepository.findRequestById(client, requestId, true);
      if (!existing) throw new AppError(404, 'NOT_FOUND', 'Support request not found.');
      if (existing.student_id !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own support request.');
      }

      const updated = await supportRepository.updateRequestStatusIfPending(
        client,
        requestId,
        'CANCELLED'
      );
      if (!updated) {
        throw new AppError(409, 'REQUEST_NOT_PENDING', 'Only PENDING support requests can be cancelled.');
      }

      await appendAuditEvent(client, {
        actorId: actor.id,
        targetStudentId: actor.id,
        eventType: 'REQUEST_CANCELLED',
        entityType: 'SUPPORT_REQUEST',
        entityId: requestId,
        payload: { slotId: existing.slot_id, status: 'CANCELLED' },
      });

      await client.query('COMMIT');
      return toSupportRequestDto({
        ...updated,
        start_time: existing.start_time,
        end_time: existing.end_time,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async confirmRequest(actor, { requestId, idempotencyKey, requestHash }) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can confirm support requests.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await executeWithIdempotency(
        client,
        {
          userId: actor.id,
          route: `POST:/api/requests/${requestId}/confirm`,
          idempotencyKey,
          requestHash,
        },
        async () => {
          const reqRow = await supportRepository.findRequestById(client, requestId, false);
          if (!reqRow) throw new AppError(404, 'NOT_FOUND', 'Support request not found.');

          const slot = await supportRepository.lockSlotById(client, reqRow.slot_id);
          if (!slot) throw new AppError(404, 'NOT_FOUND', 'Support slot not found.');
          if (slot.professor_id !== actor.id) {
            throw new AppError(403, 'FORBIDDEN', 'You do not own this support slot.');
          }
          if (slot.status !== 'OPEN') {
            const alternatives = await supportRepository.findSuggestedAlternativeSlots(
              client,
              slot.professor_id,
              slot.id
            );
            throw new AppError(
              409,
              'SLOT_ALREADY_CONFIRMED',
              'This slot already has a confirmed student.',
              alternatives
            );
          }

          let confirmedRow;
          try {
            confirmedRow = await supportRepository.updateRequestStatusIfPending(
              client,
              requestId,
              'CONFIRMED'
            );
          } catch (pgErr) {
            if (pgErr?.code === '23505') {
              const alternatives = await supportRepository.findSuggestedAlternativeSlots(
                client,
                slot.professor_id,
                slot.id
              );
              throw new AppError(
                409,
                'SLOT_ALREADY_CONFIRMED',
                'This slot already has a confirmed student.',
                alternatives
              );
            }
            if (pgErr?.code === '23P01') {
              const alternatives = await supportRepository.findSuggestedAlternativeSlots(
                client,
                slot.professor_id,
                slot.id
              );
              throw new AppError(
                409,
                'STUDENT_TIME_CONFLICT',
                'Student already has an overlapping confirmed session.',
                alternatives
              );
            }
            throw pgErr;
          }

          if (!confirmedRow) {
            throw new AppError(409, 'REQUEST_NOT_PENDING', 'Support request is no longer PENDING.');
          }

          const displaced = await supportRepository.markOtherPendingRequestsNeedsReschedule(
            client,
            slot.id,
            confirmedRow.id
          );
          await supportRepository.closeSlot(client, slot.id);

          await appendAuditEvent(client, {
            actorId: actor.id,
            targetStudentId: confirmedRow.student_id,
            eventType: 'REQUEST_CONFIRMED',
            entityType: 'SUPPORT_REQUEST',
            entityId: confirmedRow.id,
            payload: {
              slotId: slot.id,
              studentId: confirmedRow.student_id,
              professorId: actor.id,
              displacedCount: displaced.length,
            },
          });

          await supportRepository.insertNotification(client, {
            userId: confirmedRow.student_id,
            type: 'SUPPORT_REQUEST_CONFIRMED',
            message: 'Your support session request has been confirmed.',
            metadata: {
              requestId: confirmedRow.id,
              slotId: slot.id,
              startTime: slot.start_time.toISOString(),
              endTime: slot.end_time.toISOString(),
            },
          });

          if (supportService._testHookBeforeConfirmCommit) {
            await supportService._testHookBeforeConfirmCommit();
          }

          return {
            statusCode: 200,
            body: {
              request: toSupportRequestDto({
                ...confirmedRow,
                start_time: slot.start_time,
                end_time: slot.end_time,
              }),
            },
          };
        }
      );

      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async rescheduleRequest(actor, requestId, newSlotId) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can reschedule support requests.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await supportRepository.findRequestById(client, requestId, true);
      if (!existing) throw new AppError(404, 'NOT_FOUND', 'Support request not found.');
      if (existing.slot_professor_id !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not own the slot for this request.');
      }
      if (existing.status !== 'PENDING' && existing.status !== 'NEEDS_RESCHEDULE') {
        throw new AppError(
          409,
          'REQUEST_NOT_PENDING',
          'Only PENDING or NEEDS_RESCHEDULE requests can be rescheduled.'
        );
      }

      const targetSlot = await supportRepository.lockSlotById(client, newSlotId);
      if (!targetSlot) throw new AppError(404, 'NOT_FOUND', 'Target support slot not found.');
      if (targetSlot.professor_id !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'You can only reschedule into your own support slot.');
      }
      if (targetSlot.status !== 'OPEN') {
        throw new AppError(409, 'SLOT_ALREADY_CONFIRMED', 'Target support slot is not open.');
      }

      const moved = await supportRepository.moveRequestToSlot(client, {
        requestId,
        newSlotId: targetSlot.id,
        startTime: targetSlot.start_time,
        endTime: targetSlot.end_time,
      });
      if (!moved) throw new AppError(409, 'REQUEST_NOT_PENDING', 'Could not reschedule request.');

      await appendAuditEvent(client, {
        actorId: actor.id,
        targetStudentId: moved.student_id,
        eventType: 'REQUEST_RESCHEDULED',
        entityType: 'SUPPORT_REQUEST',
        entityId: moved.id,
        payload: { previousSlotId: existing.slot_id, newSlotId: targetSlot.id, status: moved.status },
      });

      await supportRepository.insertNotification(client, {
        userId: moved.student_id,
        type: 'SUPPORT_REQUEST_RESCHEDULED',
        message: 'Your support request has been moved to a new open slot.',
        metadata: { requestId: moved.id, newSlotId: targetSlot.id },
      });

      await client.query('COMMIT');
      return toSupportRequestDto({
        ...moved,
        start_time: targetSlot.start_time,
        end_time: targetSlot.end_time,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};