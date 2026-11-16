-- ============================================================================
-- 1. ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'PROFESSOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE slot_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NEEDS_RESCHEDULE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. USERS & AUTHENTICATION
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (position('@' in email) > 1),
  full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) > 0),
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);

-- ============================================================================
-- 3. COURSES, OFFERINGS & ENROLLMENTS
-- ============================================================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (char_length(btrim(code)) > 0),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) > 0),
  credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  professor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  semester_number INTEGER NOT NULL CHECK (semester_number >= 1 AND semester_number <= 12),
  semester_term TEXT NOT NULL CHECK (char_length(btrim(semester_term)) > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date > start_date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, semester_number, semester_term)
);

CREATE INDEX idx_course_offerings_professor ON course_offerings(professor_id);
CREATE INDEX idx_course_offerings_semester ON course_offerings(semester_number, end_date);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE RESTRICT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, offering_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id);

-- ============================================================================
-- 4. SUPPORT SLOTS & REQUESTS (WITH CONCURRENCY INVARIANTS)
-- ============================================================================
CREATE TABLE support_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity = 1),
  status slot_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_slot_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_support_slots_prof_time ON support_slots(professor_id, start_time, end_time);
CREATE INDEX idx_support_slots_status_time ON support_slots(status, start_time);

CREATE TABLE support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES support_slots(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  topic TEXT NOT NULL CHECK (char_length(btrim(topic)) > 0),
  status request_status NOT NULL DEFAULT 'PENDING',
  time_range TSTZRANGE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_request_time_range CHECK (NOT isempty(time_range) AND lower_inc(time_range) AND NOT upper_inc(time_range))
);

CREATE INDEX idx_support_requests_slot ON support_requests(slot_id, status);
CREATE INDEX idx_support_requests_student ON support_requests(student_id, status);

-- Mandatory Constraint 1: At most one CONFIRMED request per capacity-1 slot (PG 23505)
CREATE UNIQUE INDEX one_confirmed_request_per_slot
  ON support_requests (slot_id)
  WHERE status = 'CONFIRMED';

-- Mandatory Constraint 2: Prevent overlapping CONFIRMED sessions for the same student (PG 23P01)
ALTER TABLE support_requests
  ADD CONSTRAINT no_overlapping_confirmed_student_sessions
  EXCLUDE USING gist (
    student_id WITH =,
    time_range WITH &&
  )
  WHERE (status = 'CONFIRMED');

-- ============================================================================
-- 5. ASSESSMENTS & IMMUTABLE GRADE VERSIONS
-- ============================================================================
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0),
  max_score NUMERIC(5,2) NOT NULL CHECK (max_score > 0),
  weight_pct NUMERIC(5,2) NOT NULL CHECK (weight_pct > 0 AND weight_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (offering_id, name)
);

CREATE INDEX idx_assessments_offering ON assessments(offering_id);

CREATE TABLE grade_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version_no INTEGER NOT NULL CHECK (version_no >= 1),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
  reason TEXT,
  supersedes_id UUID REFERENCES grade_versions(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  effective_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, student_id, version_no),
  CONSTRAINT chk_correction_reason CHECK (
    (version_no = 1 AND supersedes_id IS NULL) OR
    (version_no > 1 AND supersedes_id IS NOT NULL AND reason IS NOT NULL AND char_length(btrim(reason)) > 0)
  )
);

CREATE INDEX idx_grade_versions_lookup
  ON grade_versions(student_id, assessment_id, effective_at DESC, version_no DESC);

-- ============================================================================
-- 6. APPEND-ONLY AUDIT LOG (HASH CHAIN)
-- ============================================================================
CREATE TABLE audit_events (
  seq BIGSERIAL PRIMARY KEY,
  id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  target_student_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (char_length(btrim(event_type)) > 0),
  entity_type TEXT NOT NULL CHECK (char_length(btrim(entity_type)) > 0),
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prev_hash TEXT NOT NULL CHECK (char_length(prev_hash) = 64),
  hash TEXT NOT NULL UNIQUE CHECK (char_length(hash) = 64)
);

CREATE INDEX idx_audit_events_student_timeline ON audit_events(target_student_id, seq DESC);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);

-- ============================================================================
-- 7. NOTIFICATIONS & IDEMPOTENCY KEYS
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (char_length(btrim(type)) > 0),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE idempotency_keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route TEXT NOT NULL CHECK (char_length(btrim(route)) > 0),
  idempotency_key TEXT NOT NULL CHECK (char_length(btrim(idempotency_key)) > 0),
  request_hash TEXT NOT NULL,
  status_code INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, route, idempotency_key)
);

-- ============================================================================
-- 8. DEFENSE-IN-DEPTH IMMUTABILITY TRIGGERS & PRIVILEGE REVOCATION
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_immutable_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only; % operations are forbidden.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_immutable_modification();

CREATE TRIGGER trg_grade_versions_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON grade_versions
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_immutable_modification();

-- Explicit runtime role grants and revocations
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_events FROM app_rw;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE grade_versions FROM app_rw;