import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { progressApi, requestsApi, slotsApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import {
  Card,
  EmptyState,
  Modal,
  Notice,
  PageHeading,
  Spinner,
  Stat,
  Status,
} from "../components/UI";
import { messageFor } from "../api/errors";

/* -----------------------------------------
   PROFESSOR DASHBOARD
------------------------------------------ */

export function ProfessorDashboard() {
  const { user } = useAuth();

  const slots = useQuery({ queryKey: ["slots"], queryFn: slotsApi.list });
  const requests = useQuery({
    queryKey: ["requests"],
    queryFn: requestsApi.list,
  });

  const reqs = requests.data || [];

  return (
    <>
      <PageHeading
        title={`Welcome back, ${user?.name.split(" ")[0]}.`}
        subtitle="Here's an overview of your academic support activity."
      />

      <div className="stats-grid">
        <Stat
          label="Open support slots"
          value={String((slots.data || []).length).padStart(2, "0")}
          note="Available for students"
          icon={CalendarDays}
        />
        <Stat
          label="Pending requests"
          value={String(
            reqs.filter((r) => r.status === "PENDING").length
          ).padStart(2, "0")}
          note="Require your attention"
          icon={ClipboardList}
          tone="amber"
        />
        <Stat
          label="Confirmed sessions"
          value={String(
            reqs.filter((r) => r.status === "CONFIRMED").length
          ).padStart(2, "0")}
          note="Upcoming meetings"
          icon={CheckCircle2}
        />
        <Stat
          label="To reschedule"
          value={String(
            reqs.filter((r) => r.status === "NEEDS_RESCHEDULE").length
          ).padStart(2, "0")}
          note="Students need another time"
          icon={AlertCircle}
          tone="rose"
        />
      </div>

      <div className="dashboard-grid">
        <Card>
          <div className="panel-heading">
            <div>
              <h2>Requests needing attention</h2>
              <p>Review pending student support requests.</p>
            </div>
            <Link to="/professor/requests" className="text-link">
              Open inbox <ArrowRight size={15} />
            </Link>
          </div>

          {requests.isLoading ? (
            <Spinner />
          ) : reqs.filter((r) => r.status === "PENDING").length === 0 ? (
            <EmptyState
              title="You're all caught up"
              text="New student requests will appear here."
            />
          ) : (
            <div className="request-mini-list">
              {reqs
                .filter((r) => r.status === "PENDING")
                .slice(0, 4)
                .map((r) => (
                  <div key={r.id} className="request-mini">
                    <strong>
                      {r.student} · {r.course}
                    </strong>
                    <small>{r.topic}</small>
                    <div>
                      <span>
                        <CalendarDays size={13} /> {r.date} · {r.time}
                      </span>
                      <Status status={r.status} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="panel-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Manage your availability and records.</p>
            </div>
          </div>

          <div className="next-actions">
            <Link to="/professor/slots" className="next-action featured">
              <CalendarDays size={17} />
              <span>
                <strong>Manage support slots</strong>
                <small>Publish or cancel availability.</small>
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/professor/grades" className="next-action">
              <ClipboardList size={17} />
              <span>
                <strong>Enter or correct grades</strong>
                <small>Keep student records current.</small>
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/professor/reschedule" className="next-action">
              <Clock3 size={17} />
              <span>
                <strong>Reschedule queue</strong>
                <small>Help students find another time.</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

/* -----------------------------------------
   PROFESSOR SLOTS
------------------------------------------ */

export function ProfessorSlots() {
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["slots"], queryFn: slotsApi.list });

  const [show, setShow] = useState(false);
  const [course, setCourse] = useState("Data Structures & Algorithms");
  const [code, setCode] = useState("CS 301");
  const [date, setDate] = useState("2026-11-18");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("10:30");

  const create = useMutation({
    mutationFn: () =>
      slotsApi.create({
        course,
        courseCode: code,
        date,
        startsAt: start,
        endsAt: end,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      setShow(false);
    },
  });

  const cancel = useMutation({
    mutationFn: (id) => slotsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slots"] }),
  });

  return (
    <>
      <PageHeading
        title="Manage Support Slots"
        subtitle="Publish and manage your one-to-one student support availability."
        action={
          <button className="button primary" onClick={() => setShow(true)}>
            <Plus size={16} /> Publish a slot
          </button>
        }
      />

      <Card>
        <div className="panel-heading">
          <div>
            <h2>Your published slots</h2>
            <p>Each slot has a capacity of one confirmed student.</p>
          </div>
        </div>

        {q.isLoading ? (
          <Spinner />
        ) : q.isError ? (
          <Notice kind="error">Unable to load slots.</Notice>
        ) : !q.data?.length ? (
          <EmptyState
            title="No open slots"
            text="Publish your first support slot so students can request a session."
          />
        ) : (
          <div className="data-list">
            {q.data.map((s) => (
              <div key={s.id} className="data-row">
                <div className="data-main">
                  <strong>{s.course}</strong>
                  <span>
                    {s.courseCode} · {s.date} · {s.startsAt}–{s.endsAt}
                  </span>
                </div>
                <div className="data-end">
                  <Status status={s.status} />
                  <button
                    className="button danger-ghost small"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(s.id)}
                  >
                    Cancel slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {show && (
        <Modal title="Publish a support slot" onClose={() => setShow(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="form-stack"
          >
            <label>
              Course
              <input
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />
            </label>

            <label>
              Course code
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>

            <label>
              Date
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <div className="form-two">
              <label>
                Start time
                <input
                  required
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>

              <label>
                End time
                <input
                  required
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>

            {create.isError && (
              <Notice kind="error">{messageFor(create.error).message}</Notice>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="button subtle"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={create.isPending}>
                {create.isPending ? "Publishing…" : "Publish slot"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* -----------------------------------------
   PROFESSOR REQUESTS / RESCHEDULE QUEUE
------------------------------------------ */

export function ProfessorRequests({ onlyReschedule = false }) {
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["requests"], queryFn: requestsApi.list });

  const [err, setErr] = useState(null);

  const confirm = useMutation({
    mutationFn: (r) =>
      requestsApi.confirm(r.id, `confirm-${r.id}-${Date.now()}`),
    onSuccess: () => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e) => setErr(messageFor(e)),
  });

  const items = (q.data || []).filter((r) =>
    onlyReschedule ? r.status === "NEEDS_RESCHEDULE" : r.status === "PENDING"
  );

  return (
    <>
      <PageHeading
        title={onlyReschedule ? "To Reschedule" : "Request Inbox"}
        subtitle={
          onlyReschedule
            ? "Students whose original slot needs a new time."
            : "Review incoming student requests and confirm one student per slot."
        }
      />

      {err && (
        <Notice kind="error">
          <strong>{err.code}</strong> — {err.message}
        </Notice>
      )}

      <Card>
        <div className="panel-heading">
          <div>
            <h2>{onlyReschedule ? "Reschedule queue" : "Pending requests"}</h2>
            <p>
              {onlyReschedule
                ? "Find an alternative slot for each student."
                : "Confirming a request will move other pending requests on that slot to the reschedule queue."}
            </p>
          </div>
          <span className="count-pill">{items.length}</span>
        </div>

        {q.isLoading ? (
          <Spinner />
        ) : q.isError ? (
          <Notice kind="error">
            Unable to load requests.{" "}
            <button className="inline-action" onClick={() => q.refetch()}>
              Try again
            </button>
          </Notice>
        ) : items.length === 0 ? (
          <EmptyState
            title={
              onlyReschedule ? "No students waiting to reschedule" : "No pending requests"
            }
            text={
              onlyReschedule
                ? "The queue is clear."
                : "New requests from students will appear here."
            }
          />
        ) : (
          <div className="data-list">
            {items.map((r) => (
              <div key={r.id} className="data-row">
                <div className="data-main">
                  <strong>
                    {r.student} · {r.course}
                  </strong>
                  <span>{r.topic}</span>
                  <small>
                    <CalendarDays size={13} /> {r.date} · {r.time} ·{" "}
                    {r.professor}
                  </small>
                </div>

                <div className="data-end">
                  <Status status={r.status} />

                  {!onlyReschedule && (
                    <button
                      className="button primary small"
                      disabled={confirm.isPending}
                      onClick={() => confirm.mutate(r)}
                    >
                      {confirm.isPending ? "Confirming…" : "Confirm"}{" "}
                      <CheckCircle2 size={14} />
                    </button>
                  )}

                  {onlyReschedule && (
                    <Link
                      to="/professor/slots"
                      className="button subtle small"
                    >
                      View open slots
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* -----------------------------------------
   GRADE MANAGEMENT (XLSX IMPORT)
------------------------------------------ */

export function GradeManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [courseCode, setCourseCode] = useState("CS 301");
  const [assessmentName, setAssessmentName] = useState("Midterm");
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [isReading, setIsReading] = useState(false);

  const courses = [
    { code: "CS 301", name: "Data Structures & Algorithms" },
    { code: "CS 305", name: "Database Management Systems" },
    { code: "CS 310", name: "Software Engineering" },
    { code: "CS 312", name: "Computer Networks" },
    { code: "MA 301", name: "Applied Mathematics III" },
    { code: "HU 302", name: "Technical Communication" },
  ];

  const importMutation = useMutation({
    mutationFn: (rows) =>
      progressApi.importGrades({
        courseCode,
        courseName: courses.find((course) => course.code === courseCode)?.name,
        assessmentName,
        professorId: user?.id,
        rows,
      }),
    onSuccess: (result) => {
      setImportSummary(result);
      setPreviewRows([]);
      setFile(null);
      setValidationErrors([]);
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["academic-progress"] });
    },
  });

  const handleFile = async (selectedFile) => {
    setImportSummary(null);
    setValidationErrors([]);
    setPreviewRows([]);
    setFile(selectedFile || null);

    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extension)) {
      setValidationErrors([
        "Unsupported file type. Upload an .xlsx, .xls or .csv spreadsheet.",
      ]);
      return;
    }

    setIsReading(true);

    try {
      const XLSX = await import("xlsx");
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
      });

      const required = ["studentId", "studentName", "score", "maxScore"];
      const headers = rawRows.length ? Object.keys(rawRows[0]) : [];

      const normalized = (value) =>
        String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");

      const headerMap = Object.fromEntries(
        headers.map((header) => [normalized(header), header])
      );

      const missing = required.filter((key) => !headerMap[normalized(key)]);
      if (missing.length) {
        setValidationErrors([
          `Missing required columns: ${missing.join(
            ", "
          )}. Required headers: studentId, studentName, score, maxScore.`,
        ]);
        return;
      }

      const rows = rawRows.map((row, index) => ({
        rowNumber: index + 2,
        studentId: String(row[headerMap.studentid]).trim(),
        studentName: String(row[headerMap.studentname]).trim(),
        score: Number(row[headerMap.score]),
        maxScore: Number(row[headerMap.maxscore]),
      }));

      const errors = [];
      const seen = new Set();

      rows.forEach((row) => {
        if (!row.studentId || !row.studentName) {
          errors.push(
            `Row ${row.rowNumber}: student ID and student name are required.`
          );
        }

        if (
          !Number.isFinite(row.score) ||
          !Number.isFinite(row.maxScore) ||
          row.maxScore <= 0 ||
          row.score < 0 ||
          row.score > row.maxScore
        ) {
          errors.push(
            `Row ${row.rowNumber}: marks must be numeric, non-negative, and score cannot exceed maximum marks.`
          );
        }

        if (seen.has(row.studentId)) {
          errors.push(
            `Row ${row.rowNumber}: duplicate student ID ${row.studentId}.`
          );
        }
        seen.add(row.studentId);
      });

      if (!rows.length) {
        errors.push("The spreadsheet contains no student records.");
      }

      setValidationErrors(errors);
      setPreviewRows(rows);
    } catch (error) {
      setValidationErrors([
        "The spreadsheet could not be read. Check that it is a valid Excel or CSV file.",
      ]);
    } finally {
      setIsReading(false);
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet([
      {
        studentId: "SAU24001",
        studentName: "Student Name",
        score: 42,
        maxScore: 50,
      },
      {
        studentId: "SAU24002",
        studentName: "Student Name",
        score: 38,
        maxScore: 50,
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
    XLSX.writeFile(workbook, "SAU-grade-upload-template.xlsx");
  };

  const canImport =
    previewRows.length > 0 &&
    validationErrors.length === 0 &&
    !importMutation.isPending;

  return (
    <>
      <PageHeading
        title="Grade Management"
        subtitle="Import assessment results for an entire course using an Excel spreadsheet."
      />

      <Card>
        <div className="panel-heading">
          <div>
            <h2>Import course grades</h2>
            <p>
              Upload, validate and review student marks before adding them to
              academic records.
            </p>
          </div>
          <button
            type="button"
            className="button subtle small"
            onClick={downloadTemplate}
          >
            Download template
          </button>
        </div>

        <div className="form-stack">
          <div className="form-two">
            <label>
              Course
              <select
                value={courseCode}
                onChange={(e) => {
                  setCourseCode(e.target.value);
                  setPreviewRows([]);
                  setImportSummary(null);
                }}
              >
                {courses.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Assessment name
              <input
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="e.g. Midterm examination"
                required
              />
            </label>
          </div>

          <label className="grade-upload-zone">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="grade-file-input"
            />
            <span className="grade-upload-icon">
              <ClipboardList size={30} />
            </span>
            <strong>
              {file ? file.name : "Choose an Excel or CSV spreadsheet"}
            </strong>
            <span className="muted">
              {isReading
                ? "Reading spreadsheet…"
                : "Accepted formats: .xlsx, .xls and .csv"}
            </span>
            <span className="button primary small">Browse files</span>
          </label>

          <Notice>
            Required columns: studentId, studentName, score and maxScore. Each
            student should appear once per assessment upload.
          </Notice>

          {validationErrors.length > 0 && (
            <Notice kind="error">
              <div>
                <strong>Please correct these issues before importing:</strong>
                <ul className="grade-error-list">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </Notice>
          )}

          {previewRows.length > 0 && (
            <div className="grade-preview">
              <div className="panel-heading">
                <div>
                  <h2>Import preview</h2>
                  <p>{previewRows.length} student records detected</p>
                </div>
                <span className="count-pill">
                  {previewRows.length} rows
                </span>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student name</th>
                      <th>Score</th>
                      <th>Maximum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.studentId}</td>
                        <td>{row.studentName}</td>
                        <td>{row.score}</td>
                        <td>{row.maxScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {previewRows.length > 10 && (
                  <p className="muted">
                    Showing first 10 of {previewRows.length} rows.
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => {
                    setPreviewRows([]);
                    setFile(null);
                  }}
                >
                  Clear file
                </button>

                <button
                  type="button"
                  className="button primary"
                  disabled={!canImport}
                  onClick={() => importMutation.mutate(previewRows)}
                >
                  {importMutation.isPending
                    ? "Importing…"
                    : "Confirm grade import"}
                </button>
              </div>
            </div>
          )}

          {importMutation.isError && (
            <Notice kind="error">
              {messageFor(importMutation.error).message}
            </Notice>
          )}

          {importSummary && (
            <Notice kind="success">
              Import complete: {importSummary.imported} grade records added for{" "}
              {importSummary.courseCode} — {importSummary.assessmentName}.
            </Notice>
          )}
        </div>
      </Card>

      <Card>
        <div className="grade-guidance">
          <h2>Before you import</h2>
          <ul>
            <li>
              Use the downloadable template to keep column names consistent.
            </li>
            <li>Marks must be numeric and cannot exceed the maximum marks.</li>
            <li>Duplicate student IDs in one upload are rejected.</li>
            <li>
              Review the preview carefully. Confirmed imports become part of the
              student's academic record.
            </li>
          </ul>
        </div>
      </Card>
    </>
  );
}