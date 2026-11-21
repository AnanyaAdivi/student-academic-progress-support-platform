import { pool } from '../db/pool.js';
import { appendAuditEvent } from '../audit/audit.writer.js';
import { toGradeVersionDto, toHistoryEventDto } from '../dto/mappers.js';
import { AppError } from '../middleware/errorHandler.js';
import { executeWithIdempotency } from '../middleware/idempotency.js';
import { academicRepository } from '../repositories/academic.repository.js';

function scoreToLetterAndPoints(score) {
  if (score === null) return { grade: null, points: null };
  if (score >= 85) return { grade: 'A', points: 4.0 };
  if (score >= 80) return { grade: 'A-', points: 3.7 };
  if (score >= 75) return { grade: 'B+', points: 3.3 };
  if (score >= 70) return { grade: 'B', points: 3.0 };
  if (score >= 60) return { grade: 'C', points: 2.0 };
  if (score >= 50) return { grade: 'D', points: 1.0 };
  return { grade: 'F', points: 0.0 };
}

function normalizeAsOfTimestamp(asOf) {
  if (!asOf) return new Date().toISOString();
  // If user passes date-only (YYYY-MM-DD), include full day up to 23:59:59.999Z
  if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return `${asOf}T23:59:59.999Z`;
  }
  return new Date(asOf).toISOString();
}

export const academicService = {
  async getStudentProgress(actor, studentId, asOfRaw) {
    if (actor.role === 'STUDENT' && actor.id !== studentId) {
      throw new AppError(403, 'FORBIDDEN', 'Students can only access their own academic progress.');
    }

    const exists = await academicRepository.studentExists(studentId);
    if (!exists) {
      throw new AppError(404, 'NOT_FOUND', 'Student not found.');
    }

    let professorFilter = null;
    if (actor.role === 'PROFESSOR') {
      const teaches = await academicRepository.professorTeachesStudent(actor.id, studentId);
      if (!teaches) {
        throw new AppError(403, 'FORBIDDEN', 'You can only view progress for students in your courses.');
      }
      professorFilter = actor.id;
    }

    const asOfTimestamp = normalizeAsOfTimestamp(asOfRaw);
    const asOfDateLabel = asOfRaw ?? asOfTimestamp.slice(0, 10);

    const enrollments = await academicRepository.findStudentEnrollmentsAtDate(
      studentId,
      asOfTimestamp,
      professorFilter
    );

    if (enrollments.length === 0) {
      return {
        studentId,
        asOf: asOfDateLabel,
        semester: null,
        summary: { gpa: null, credits: 0, progress: null },
        courses: [],
      };
    }

    // Select the latest active semester at or before asOf
    const targetSemNumber = enrollments[0].semester_number;
    const targetSemTerm = enrollments[0].semester_term;
    const semesterOfferings = enrollments.filter((e) => e.semester_number === targetSemNumber);

    const assessmentRows = await academicRepository.findAssessmentsWithLatestGradesAsOf(
      studentId,
      semesterOfferings.map((o) => o.offering_id),
      asOfTimestamp
    );

    const courses = semesterOfferings.map((offering) => {
      const courseAssessments = assessmentRows.filter((a) => a.offering_id === offering.offering_id);
      let completedWeight = 0;
      let weightedSum = 0;

      const assessments = courseAssessments.map((a) => {
        const hasGrade = a.grade_version_id !== null;
        const score = hasGrade ? Number(a.score) : null;
        const maxScore = Number(a.max_score);
        const weightPct = Number(a.weight_pct);

        if (hasGrade) {
          completedWeight += weightPct;
          weightedSum += (score / maxScore) * weightPct;
        }

        return {
          id: a.assessment_id,
          name: a.name,
          maxScore,
          weightPct,
          gradeVersionId: a.grade_version_id ?? null,
          versionNo: a.version_no ?? null,
          score,
          effectiveAt: a.effective_at ? a.effective_at.toISOString() : null,
        };
      });

      const normalizedScore =
        completedWeight > 0 ? Math.round((weightedSum / completedWeight) * 100) : null;
      const { grade, points } = scoreToLetterAndPoints(normalizedScore);

      return {
        id: offering.course_id,
        offeringId: offering.offering_id,
        code: offering.code,
        title: offering.title,
        credits: offering.credits,
        progress: Math.round(completedWeight),
        score: normalizedScore,
        grade,
        _points: points,
        assessments,
      };
    });

    let totalCredits = 0;
    let gradedCredits = 0;
    let weightedGpaPoints = 0;
    let totalProgress = 0;

    for (const c of courses) {
      totalCredits += c.credits;
      totalProgress += c.progress;
      if (c._points !== null) {
        gradedCredits += c.credits;
        weightedGpaPoints += c._points * c.credits;
      }
    }

    const gpa =
      gradedCredits > 0 ? Number((weightedGpaPoints / gradedCredits).toFixed(2)) : null;
    const avgProgress = courses.length > 0 ? Math.round(totalProgress / courses.length) : null;

    return {
      studentId,
      asOf: asOfDateLabel,
      semester: { number: targetSemNumber, term: targetSemTerm },
      summary: { gpa, credits: totalCredits, progress: avgProgress },
      courses: courses.map(({ _points, ...rest }) => rest),
    };
  },

  async createGrade(actor, assessmentId, { studentId, score, effectiveAt }) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can record assessment grades.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const assessment = await academicRepository.findAssessmentWithOffering(client, assessmentId);
      if (!assessment) throw new AppError(404, 'NOT_FOUND', 'Assessment not found.');
      if (assessment.professor_id !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not teach the course for this assessment.');
      }

      if (score > Number(assessment.max_score)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `Score cannot exceed assessment max_score (${assessment.max_score}).`
        );
      }

      const enrolled = await academicRepository.isStudentEnrolled(
        client,
        studentId,
        assessment.offering_id
      );
      if (!enrolled) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Student is not enrolled in this course offering.');
      }

      const currentMaxVer = await academicRepository.findLatestVersionNo(
        client,
        assessmentId,
        studentId
      );
      if (currentMaxVer > 0) {
        throw new AppError(
          409,
          'GRADE_VERSION_CONFLICT',
          'Initial grade already exists. Use POST /api/grades/:id/correct to submit a new version.'
        );
      }

      const effectiveIso = effectiveAt ? new Date(effectiveAt).toISOString() : new Date().toISOString();
      let inserted;
      try {
        inserted = await academicRepository.insertGradeVersion(client, {
          assessmentId,
          studentId,
          versionNo: 1,
          score,
          reason: null,
          supersedesId: null,
          recordedBy: actor.id,
          effectiveAt: effectiveIso,
        });
      } catch (pgErr) {
        if (pgErr?.code === '23505') {
          throw new AppError(409, 'GRADE_VERSION_CONFLICT', 'Grade version conflict detected.');
        }
        throw pgErr;
      }

      await appendAuditEvent(client, {
        actorId: actor.id,
        targetStudentId: studentId,
        eventType: 'GRADE_CREATED',
        entityType: 'GRADE_VERSION',
        entityId: inserted.id,
        payload: { assessmentId, versionNo: 1, score },
      });

      await client.query('COMMIT');
      return toGradeVersionDto(inserted);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async correctGrade(actor, gradeId, { score, reason, effectiveAt }) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can correct grades.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const prev = await academicRepository.findGradeVersionWithOffering(client, gradeId);
      if (!prev) throw new AppError(404, 'NOT_FOUND', 'Grade version not found.');
      if (prev.professor_id !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not teach the course for this grade.');
      }

      if (score > Number(prev.max_score)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `Score cannot exceed assessment max_score (${prev.max_score}).`
        );
      }

      // Optimistic version check: reject stale writes if a newer version already exists
      const latestVer = await academicRepository.findLatestVersionNo(
        client,
        prev.assessment_id,
        prev.student_id
      );
      if (latestVer !== prev.version_no) {
        throw new AppError(
          409,
          'GRADE_VERSION_CONFLICT',
          'A newer grade version already exists. Correct the latest version instead.'
        );
      }

      const nextVersionNo = prev.version_no + 1;
      const effectiveIso = effectiveAt ? new Date(effectiveAt).toISOString() : new Date().toISOString();

      let inserted;
      try {
        inserted = await academicRepository.insertGradeVersion(client, {
          assessmentId: prev.assessment_id,
          studentId: prev.student_id,
          versionNo: nextVersionNo,
          score,
          reason,
          supersedesId: prev.id,
          recordedBy: actor.id,
          effectiveAt: effectiveIso,
        });
      } catch (pgErr) {
        if (pgErr?.code === '23505') {
          throw new AppError(409, 'GRADE_VERSION_CONFLICT', 'Concurrent grade correction conflict.');
        }
        throw pgErr;
      }

      await appendAuditEvent(client, {
        actorId: actor.id,
        targetStudentId: prev.student_id,
        eventType: 'GRADE_CORRECTED',
        entityType: 'GRADE_VERSION',
        entityId: inserted.id,
        payload: {
          assessmentId: prev.assessment_id,
          versionNo: nextVersionNo,
          score,
          reason,
          supersedesId: prev.id,
        },
      });

      await client.query('COMMIT');
      return toGradeVersionDto(inserted);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async importGrades(actor, payload, { idempotencyKey = null, requestHash = null } = {}) {
    if (actor.role !== 'PROFESSOR') {
      throw new AppError(403, 'FORBIDDEN', 'Only professors can import grades.');
    }

    const seen = new Set();
    for (const row of payload.rows) {
      const key = row.studentId.trim().toLowerCase();
      if (seen.has(key)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `Duplicate studentId "${row.studentId}" found in import rows.`
        );
      }
      seen.add(key);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const runImport = async () => {
        let offering = await academicRepository.findOfferingByProfessorAndCourseCode(
          client,
          actor.id,
          payload.courseCode
        );

        if (!offering) {
          const existingCourse = await academicRepository.findCourseByCode(
            client,
            payload.courseCode
          );
          if (existingCourse) {
            const ownedCodes = await academicRepository.listProfessorCourseCodes(client, actor.id);
            throw new AppError(
              403,
              'FORBIDDEN',
              `You do not teach ${payload.courseCode}. Your assigned courses: ${ownedCodes.join(", ") || "none"}.`
            );
          }
          offering = await academicRepository.createCourseAndOffering(client, {
            professorId: actor.id,
            courseCode: payload.courseCode,
            courseName: payload.courseName,
          });
        }

        const defaultMaxScore = payload.rows[0].maxScore;
        const assessment = await academicRepository.findOrCreateAssessment(client, {
          offeringId: offering.offering_id,
          name: payload.assessmentName,
          maxScore: defaultMaxScore,
        });

        const assessmentMax = Number(assessment.max_score);
        const effectiveIso = new Date().toISOString();
        const importedGrades = [];
        let createdCount = 0;
        let correctedCount = 0;

        for (let i = 0; i < payload.rows.length; i++) {
          const row = payload.rows[i];
          const rowLabel = row.rowNumber ?? i + 2;

          if (row.score > assessmentMax) {
            throw new AppError(
              400,
              'VALIDATION_ERROR',
              `Row ${rowLabel}: score (${row.score}) exceeds assessment max_score (${assessmentMax}).`
            );
          }

          const student = await academicRepository.resolveStudentForImport(client, {
            studentId: row.studentId,
            studentName: row.studentName,
          });
          if (!student) {
            throw new AppError(
              400,
              'VALIDATION_ERROR',
              `Row ${rowLabel}: student "${row.studentId}" not found.`
            );
          }

          await academicRepository.ensureStudentEnrolled(client, student.id, offering.offering_id);

          const latest = await academicRepository.findLatestGradeVersion(
            client,
            assessment.id,
            student.id
          );

          const isCorrection = Boolean(latest);
          const nextVersionNo = isCorrection ? Number(latest.version_no) + 1 : 1;

          const inserted = await academicRepository.insertGradeVersion(client, {
            assessmentId: assessment.id,
            studentId: student.id,
            versionNo: nextVersionNo,
            score: row.score,
            reason: isCorrection ? 'Bulk spreadsheet grade import' : null,
            supersedesId: isCorrection ? latest.id : null,
            recordedBy: actor.id,
            effectiveAt: effectiveIso,
          });

          await appendAuditEvent(client, {
            actorId: actor.id,
            targetStudentId: student.id,
            eventType: isCorrection ? 'GRADE_CORRECTED' : 'GRADE_CREATED',
            entityType: 'GRADE_VERSION',
            entityId: inserted.id,
            payload: isCorrection
              ? {
                  assessmentId: assessment.id,
                  versionNo: nextVersionNo,
                  score: row.score,
                  reason: 'Bulk spreadsheet grade import',
                  supersedesId: latest.id,
                }
              : {
                  assessmentId: assessment.id,
                  versionNo: 1,
                  score: row.score,
                },
          });

          if (isCorrection) correctedCount += 1;
          else createdCount += 1;

          importedGrades.push(toGradeVersionDto(inserted));
        }

        return {
          statusCode: 201,
          body: {
            imported: importedGrades.length,
            created: createdCount,
            corrected: correctedCount,
            courseCode: offering.code,
            courseName: offering.title,
            assessmentId: assessment.id,
            assessmentName: assessment.name,
            grades: importedGrades,
          },
        };
      };

      const result = idempotencyKey
        ? await executeWithIdempotency(
            client,
            {
              userId: actor.id,
              route: 'POST:/api/grades/import',
              idempotencyKey,
              requestHash,
            },
            runImport
          )
        : await runImport();

      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getStudentHistory(actor, studentId) {
    if (actor.role === 'STUDENT' && actor.id !== studentId) {
      throw new AppError(403, 'FORBIDDEN', 'Students can only view their own academic history.');
    }

    const exists = await academicRepository.studentExists(studentId);
    if (!exists) throw new AppError(404, 'NOT_FOUND', 'Student not found.');

    if (actor.role === 'PROFESSOR') {
      const teaches = await academicRepository.professorTeachesStudent(actor.id, studentId);
      if (!teaches) {
        throw new AppError(403, 'FORBIDDEN', 'You can only view history for students in your courses.');
      }
    }

    const rows = await academicRepository.findStudentAuditHistory(studentId);
    return rows.map(toHistoryEventDto);
  },
};