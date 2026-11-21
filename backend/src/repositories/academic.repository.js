import { pool } from '../db/pool.js';

export const academicRepository = {
  async studentExists(studentId) {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'STUDENT'`,
      [studentId]
    );
    return rows.length > 0;
  },

  async professorTeachesStudent(professorId, studentId) {
    const { rows } = await pool.query(
      `SELECT EXISTS(
         SELECT 1
         FROM enrollments e
         JOIN course_offerings co ON co.id = e.offering_id
         WHERE e.student_id = $1 AND co.professor_id = $2
       ) AS teaches`,
      [studentId, professorId]
    );
    return Boolean(rows[0]?.teaches);
  },

  async findStudentEnrollmentsAtDate(studentId, asOfTimestamp, professorIdFilter = null) {
    const values = [studentId, asOfTimestamp];
    let profFilterSql = '';
    if (professorIdFilter) {
      values.push(professorIdFilter);
      profFilterSql = `AND co.professor_id = $3`;
    }

    const { rows } = await pool.query(
      `SELECT co.id AS offering_id, co.semester_number, co.semester_term,
              co.start_date, co.end_date, co.professor_id,
              c.id AS course_id, c.code, c.title, c.credits
       FROM enrollments e
       JOIN course_offerings co ON co.id = e.offering_id
       JOIN courses c ON c.id = co.course_id
       WHERE e.student_id = $1
         AND co.start_date <= ($2::timestamptz)::date
         ${profFilterSql}
       ORDER BY co.semester_number DESC, c.code ASC`,
      values
    );
    return rows;
  },

  async findAssessmentsWithLatestGradesAsOf(studentId, offeringIds, asOfTimestamp) {
    if (offeringIds.length === 0) return [];
    const { rows } = await pool.query(
      `SELECT a.id AS assessment_id, a.offering_id, a.name, a.max_score, a.weight_pct,
              gv.id AS grade_version_id, gv.version_no, gv.score, gv.reason, gv.effective_at
       FROM assessments a
       LEFT JOIN LATERAL (
         SELECT id, version_no, score, reason, effective_at
         FROM grade_versions
         WHERE assessment_id = a.id
           AND student_id = $1
           AND effective_at <= $3::timestamptz
         ORDER BY effective_at DESC, version_no DESC
         LIMIT 1
       ) gv ON TRUE
       WHERE a.offering_id = ANY($2::uuid[])
       ORDER BY a.created_at ASC`,
      [studentId, offeringIds, asOfTimestamp]
    );
    return rows;
  },

  async findAssessmentWithOffering(client, assessmentId) {
    const { rows } = await client.query(
      `SELECT a.id, a.offering_id, a.name, a.max_score, a.weight_pct, co.professor_id
       FROM assessments a
       JOIN course_offerings co ON co.id = a.offering_id
       WHERE a.id = $1`,
      [assessmentId]
    );
    return rows[0] ?? null;
  },

  async isStudentEnrolled(client, studentId, offeringId) {
    const { rows } = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM enrollments WHERE student_id = $1 AND offering_id = $2
       ) AS enrolled`,
      [studentId, offeringId]
    );
    return Boolean(rows[0]?.enrolled);
  },

  async insertGradeVersion(client, params) {
    const { rows } = await client.query(
      `INSERT INTO grade_versions
         (assessment_id, student_id, version_no, score, reason, supersedes_id, recorded_by, effective_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
       RETURNING id, assessment_id, student_id, version_no, score, reason,
                 supersedes_id, recorded_by, effective_at, recorded_at`,
      [
        params.assessmentId,
        params.studentId,
        params.versionNo,
        params.score,
        params.reason ?? null,
        params.supersedesId ?? null,
        params.recordedBy,
        params.effectiveAt,
      ]
    );
    return rows[0];
  },

  async findGradeVersionWithOffering(client, gradeId) {
    const { rows } = await client.query(
      `SELECT gv.id, gv.assessment_id, gv.student_id, gv.version_no, gv.score,
              gv.reason, gv.supersedes_id, gv.recorded_by, gv.effective_at, gv.recorded_at,
              a.max_score, co.professor_id
       FROM grade_versions gv
       JOIN assessments a ON a.id = gv.assessment_id
       JOIN course_offerings co ON co.id = a.offering_id
       WHERE gv.id = $1`,
      [gradeId]
    );
    return rows[0] ?? null;
  },

  async findLatestVersionNo(client, assessmentId, studentId) {
    const { rows } = await client.query(
      `SELECT MAX(version_no) AS max_ver
       FROM grade_versions
       WHERE assessment_id = $1 AND student_id = $2`,
      [assessmentId, studentId]
    );
    return rows[0]?.max_ver ? Number(rows[0].max_ver) : 0;
  },

  async findOfferingByProfessorAndCourseCode(client, professorId, courseCode) {
    const { rows } = await client.query(
      `SELECT co.id AS offering_id, co.professor_id, c.id AS course_id, c.code, c.title
       FROM course_offerings co
       JOIN courses c ON c.id = co.course_id
       WHERE co.professor_id = $1
         AND LOWER(REPLACE(c.code, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
       ORDER BY co.start_date DESC
       LIMIT 1`,
      [professorId, courseCode]
    );
    return rows[0] ?? null;
  },

  async findCourseByCode(client, courseCode) {
    const { rows } = await client.query(
      `SELECT id, code, title, credits
       FROM courses
       WHERE LOWER(REPLACE(code, ' ', '')) = LOWER(REPLACE($1, ' ', ''))
       LIMIT 1`,
      [courseCode]
    );
    return rows[0] ?? null;
  },

  async listProfessorCourseCodes(client, professorId) {
    const { rows } = await client.query(
      `SELECT DISTINCT c.code
       FROM course_offerings co
       JOIN courses c ON c.id = co.course_id
       WHERE co.professor_id = $1
       ORDER BY c.code ASC`,
      [professorId]
    );
    return rows.map((r) => r.code);
  },

  async createCourseAndOffering(client, { professorId, courseCode, courseName }) {
    const courseRes = await client.query(
      `INSERT INTO courses (code, title, credits)
       VALUES ($1, $2, 4)
       RETURNING id, code, title`,
      [courseCode, courseName || courseCode]
    );
    const course = courseRes.rows[0];
    const offeringRes = await client.query(
      `INSERT INTO course_offerings
         (course_id, professor_id, semester_number, semester_term, start_date, end_date)
       VALUES ($1, $2, 5, 'Fall 2026', (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE + INTERVAL '90 days')::date)
       RETURNING id AS offering_id, professor_id`,
      [course.id, professorId]
    );
    return {
      offering_id: offeringRes.rows[0].offering_id,
      professor_id: offeringRes.rows[0].professor_id,
      course_id: course.id,
      code: course.code,
      title: course.title,
    };
  },

  async findOrCreateAssessment(client, { offeringId, name, maxScore }) {
    const existing = await client.query(
      `SELECT id, offering_id, name, max_score, weight_pct
       FROM assessments
       WHERE offering_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [offeringId, name]
    );
    if (existing.rows[0]) return existing.rows[0];

    const created = await client.query(
      `INSERT INTO assessments (offering_id, name, max_score, weight_pct)
       VALUES ($1, $2, $3, 10)
       RETURNING id, offering_id, name, max_score, weight_pct`,
      [offeringId, name, maxScore]
    );
    return created.rows[0];
  },

  async resolveStudentForImport(client, { studentId, studentName }) {
    const raw = String(studentId || "").trim();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRe.test(raw)) {
      const { rows } = await client.query(
        `SELECT id, email, full_name FROM users WHERE id = $1 AND role = 'STUDENT'`,
        [raw]
      );
      if (rows[0]) return rows[0];
    }

    if (raw.includes("@")) {
      const { rows } = await client.query(
        `SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1) AND role = 'STUDENT'`,
        [raw]
      );
      if (rows[0]) return rows[0];
    }

    const digitsMatch = raw.match(/(d+)$/);
    if (digitsMatch) {
      const digits = digitsMatch[1];
      const candidates = new Set([`student${parseInt(digits, 10)}@sau.int`]);
      if (digits.length >= 4) {
        candidates.add(`student${parseInt(digits.slice(-3), 10)}@sau.int`);
      }
      for (const email of candidates) {
        const { rows } = await client.query(
          `SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1) AND role = 'STUDENT'`,
          [email]
        );
        if (rows[0]) return rows[0];
      }
    }

    if (studentName && studentName.toLowerCase() !== "student name") {
      const { rows } = await client.query(
        `SELECT id, email, full_name FROM users WHERE LOWER(full_name) = LOWER($1) AND role = 'STUDENT' LIMIT 1`,
        [studentName.trim()]
      );
      if (rows[0]) return rows[0];
    }

    return null;
  },

  async ensureStudentEnrolled(client, studentId, offeringId) {
    const enrolled = await this.isStudentEnrolled(client, studentId, offeringId);
    if (!enrolled) {
      await client.query(
        `INSERT INTO enrollments (student_id, offering_id) VALUES ($1, $2)`,
        [studentId, offeringId]
      );
    }
  },

  async findLatestGradeVersion(client, assessmentId, studentId) {
    const { rows } = await client.query(
      `SELECT id, version_no, score
       FROM grade_versions
       WHERE assessment_id = $1 AND student_id = $2
       ORDER BY version_no DESC
       LIMIT 1`,
      [assessmentId, studentId]
    );
    return rows[0] ?? null;
  },

  async findStudentAuditHistory(studentId) {
    const { rows } = await pool.query(
      `SELECT ae.seq, ae.id, ae.actor_id, u.full_name AS actor_name,
              ae.event_type, ae.entity_type, ae.entity_id, ae.payload, ae.recorded_at
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_id
       WHERE ae.target_student_id = $1
       ORDER BY ae.seq DESC`,
      [studentId]
    );
    return rows;
  },
};