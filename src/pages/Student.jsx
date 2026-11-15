import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  BarChart3,
  ClipboardList,
  Clock3,
  FileText,
  Plus,
  CheckCircle2,
  Activity,
} from "lucide-react";

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
import { calculateWeightedGPA } from "../utils/academicMetrics";

const demoSemesterHistory = [
  { semester: 3, label: "Semester 3", progress: 68, gpa: "3.21", credits: 20 },
  { semester: 4, label: "Semester 4", progress: 73, gpa: "3.43", credits: 19 },
  { semester: 5, label: "Semester 5", progress: 79, gpa: "3.62", credits: 18 },
];

/* -----------------------------------------
   INTERACTIVE SEMESTER CHART
------------------------------------------ */

function SemesterTrendChart({ selectedSemester, onSelect }) {
  const points = demoSemesterHistory.map((item, index) => ({
    ...item,
    x: 92 + index * 218,
    y: 174 - (item.progress - 55) * 3.1,
  }));

  return (
    <div className="semester-chart-wrap">
      <svg
        className="semester-chart"
        viewBox="0 0 620 230"
        role="img"
        aria-label="Academic progress trend across semesters three to five"
      >
        {[60, 70, 80, 90].map((value) => {
          const y = 174 - (value - 55) * 3.1;
          return (
            <g key={value}>
              <line
                x1="55"
                x2="580"
                y1={y}
                y2={y}
                className="chart-grid-line"
              />
              <text
                x="38"
                y={y + 4}
                className="chart-axis-label"
                textAnchor="end"
              >
                {value}%
              </text>
            </g>
          );
        })}

        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          className="semester-line"
        />

        {points.map((point) => (
          <g
            key={point.semester}
            className={
              selectedSemester === point.semester
                ? "chart-point active"
                : "chart-point"
            }
            onClick={() => onSelect(point.semester)}
            tabIndex={0}
            role="button"
            aria-label={`${point.label}: ${point.progress}%`}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                onSelect(point.semester);
              }
            }}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r={selectedSemester === point.semester ? 8 : 6}
            />
            <text
              x={point.x}
              y="205"
              textAnchor="middle"
              className="chart-axis-label"
            >
              Sem {point.semester}
            </text>
            <text
              x={point.x}
              y={point.y - 16}
              textAnchor="middle"
              className="chart-value-label"
            >
              {point.progress}%
            </text>
          </g>
        ))}
      </svg>

      <div className="chart-selection-hint">
        Select a point to inspect that semester.
      </div>
    </div>
  );
}

/* -----------------------------------------
   INTERACTIVE MULTI-SERIES LINE CHART
------------------------------------------ */

function InteractiveCourseChart({ courses }) {
  const [selectedId, setSelectedId] = useState(courses[0]?.id ?? "");

  const selectedCourse =
    courses.find((course) => course.id === selectedId) ?? courses[0];

  const width = 760;
  const height = 370;
  const left = 65;
  const right = 35;
  const top = 35;
  const bottom = 85;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const xPosition = (index) =>
    courses.length === 1
      ? left + chartWidth / 2
      : left + (index * chartWidth) / (courses.length - 1);

  const yPosition = (value) => {
    const safeValue = Math.max(0, Math.min(100, value ?? 0));
    return top + chartHeight - (safeValue / 100) * chartHeight;
  };

  const completionPoints = courses.map((course, index) => ({
    x: xPosition(index),
    y: yPosition(course.academic.completion.percentage),
    course,
    value: course.academic.completion.percentage,
  }));

  const performancePoints = courses.map((course, index) => ({
    x: xPosition(index),
    y: yPosition(course.academic.performance.percentage),
    course,
    value: course.academic.performance.percentage,
  }));

  const createPath = (points) =>
    points
      .filter((point) => point.value !== null)
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

  return (
    <Card className="interactive-chart-card">
      <div className="panel-heading chart-heading">
        <div>
          <h2>Course performance overview</h2>
          <p>
            Compare coursework completion with assessment performance across your
            enrolled courses.
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="No course data yet"
          text="Course performance will appear when academic records are available."
        />
      ) : (
        <>
          <div className="line-chart-legend">
            <span>
              <i className="legend-line completion-line" />
              Coursework completion
            </span>
            <span>
              <i className="legend-line performance-line" />
              Assessment performance
            </span>
          </div>

          <div className="line-chart-container">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="course-line-chart"
              role="img"
              aria-label="Coursework completion and assessment performance by course"
            >
              {[0, 25, 50, 75, 100].map((value) => {
                const y = yPosition(value);
                return (
                  <g key={value}>
                    <line
                      x1={left}
                      x2={width - right}
                      y1={y}
                      y2={y}
                      className="chart-grid-line"
                    />
                    <text
                      x={left - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="chart-axis-label"
                    >
                      {value}%
                    </text>
                  </g>
                );
              })}

              <path
                d={createPath(completionPoints)}
                className="course-completion-path"
              />
              <path
                d={createPath(performancePoints)}
                className="course-performance-path"
              />

              {completionPoints.map(
                (point) =>
                  point.value !== null && (
                    <g
                      key={`completion-${point.course.id}`}
                      className="line-chart-point"
                      onClick={() => setSelectedId(point.course.id)}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={selectedCourse?.id === point.course.id ? 7 : 5}
                        className="completion-dot"
                      />
                    </g>
                  )
              )}

              {performancePoints.map(
                (point) =>
                  point.value !== null && (
                    <g
                      key={`performance-${point.course.id}`}
                      className="line-chart-point"
                      onClick={() => setSelectedId(point.course.id)}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={selectedCourse?.id === point.course.id ? 7 : 5}
                        className="performance-dot"
                      />
                    </g>
                  )
              )}

              {courses.map((course, index) => (
                <g
                  key={course.id}
                  className="line-chart-course-label"
                  onClick={() => setSelectedId(course.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setSelectedId(course.id);
                    }
                  }}
                >
                  <text
                    x={xPosition(index)}
                    y={height - 48}
                    textAnchor="middle"
                    className="course-code-label"
                  >
                    {course.code}
                  </text>
                  <text
                    x={xPosition(index)}
                    y={height - 29}
                    textAnchor="middle"
                    className="course-name-label"
                  >
                    {course.title.length > 13
                      ? `${course.title.slice(0, 12)}…`
                      : course.title}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {selectedCourse && (
            <div className="chart-detail">
              <div>
                <span className="eyebrow">SELECTED COURSE</span>
                <strong>{selectedCourse.title}</strong>
                <small>
                  {selectedCourse.code} · Grade{" "}
                  {selectedCourse.grade ?? "Pending"}
                </small>
              </div>

              <div className="chart-detail-metrics">
                <div>
                  <strong>
                    {selectedCourse.academic.completion.percentage ?? "—"}
                    {selectedCourse.academic.completion.percentage !== null
                      ? "%"
                      : ""}
                  </strong>
                  <span>Coursework completion</span>
                </div>
                <div>
                  <strong>
                    {selectedCourse.academic.performance.percentage ?? "—"}
                    {selectedCourse.academic.performance.percentage !== null
                      ? "%"
                      : ""}
                  </strong>
                  <span>Assessment performance</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* -----------------------------------------
   STUDENT DASHBOARD
------------------------------------------ */

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const progress = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => progressApi.get(user.id),
    enabled: Boolean(user?.id),
  });

  const requests = useQuery({
    queryKey: ["requests"],
    queryFn: requestsApi.list,
  });

  const history = useQuery({
    queryKey: ["history", user?.id],
    queryFn: () => progressApi.history(user.id),
    enabled: Boolean(user?.id),
  });

  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(5);

  const preferenceKey = `sap_dashboard_widgets_${user?.id ?? "student"}`;

  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    if (typeof window === "undefined") {
      return ["overview", "requests", "activity", "nextStep"];
    }
    try {
      const saved = window.localStorage.getItem(preferenceKey);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
        ? parsed
        : ["overview", "requests", "activity", "nextStep"];
    } catch {
      return ["overview", "requests", "activity", "nextStep"];
    }
  });

  useEffect(() => {
    if (!user?.id) return;
    window.localStorage.setItem(
      preferenceKey,
      JSON.stringify(visibleWidgets)
    );
  }, [preferenceKey, user?.id, visibleWidgets]);

  const courses = Array.isArray(progress.data) ? progress.data : [];
  const reqs = Array.isArray(requests.data) ? requests.data : [];
  const activities = Array.isArray(history.data) ? history.data : [];
  const pendingRequests = reqs.filter((request) => request.status === "PENDING");

  const sgpa = calculateWeightedGPA(courses);
  const currentSemester =
    demoSemesterHistory.find((item) => item.semester === selectedSemester) ??
    demoSemesterHistory[2];

  const widgetOptions = [
    {
      id: "overview",
      title: "Academic overview",
      description: "Semester GPA and course-wise progress",
    },
    {
      id: "requests",
      title: "Support requests",
      description: "Recent professor consultation requests",
    },
    {
      id: "activity",
      title: "Recent academic activity",
      description: "Latest academic record updates",
    },
    {
      id: "nextStep",
      title: "Your next step",
      description: "Shortcuts to important student tasks",
    },
  ];

  const toggleWidget = (id) => {
    setVisibleWidgets((current) =>
      current.includes(id)
        ? current.filter((widget) => widget !== id)
        : [...current, id]
    );
  };

  const restoreDefaults = () => {
    setVisibleWidgets(["overview", "requests", "activity", "nextStep"]);
  };

  return (
    <>
      <PageHeading
        title={`Welcome back, ${user?.name.split(" ")[0]}.`}
        subtitle="Your academic snapshot, priorities and support activity — organised around what matters to you."
        action={
          <div className="dashboard-heading-actions">
            <span className="standing-pill">
              <i /> Your semester at a glance
            </span>
            <button
              className="button subtle customise-button"
              onClick={() => setCustomiseOpen((open) => !open)}
              aria-expanded={customiseOpen}
            >
              <Activity size={14} />
              {customiseOpen ? "Close settings" : "Personalise dashboard"}
            </button>
          </div>
        }
      />

      {customiseOpen && (
        <Card className="customise-panel">
          <div className="panel-heading">
            <div>
              <h2>Make this dashboard yours</h2>
              <p>
                Choose the academic widgets you want to see. Your choices are
                saved on this device.
              </p>
            </div>
            <button className="clear-link" onClick={restoreDefaults}>
              Restore defaults
            </button>
          </div>

          <div className="widget-preferences">
            {widgetOptions.map((widget) => (
              <label key={widget.id} className="widget-preference">
                <input
                  type="checkbox"
                  checked={visibleWidgets.includes(widget.id)}
                  onChange={() => toggleWidget(widget.id)}
                />
                <span>
                  <strong>{widget.title}</strong>
                  <small>{widget.description}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="preference-footnote">
            Core information — semester, academic progress, enrolled courses and
            pending requests — remains available regardless of these settings.
          </div>
        </Card>
      )}

      <div className="stats-grid">
        <Stat
          label="Current semester"
          value="05"
          note="Fall 2026 · Aug – Dec"
          icon={CalendarDays}
          onClick={() => navigate("/student/progress")}
        />
        <Stat
          label="Semester GPA"
          value={
            progress.isLoading || progress.isError
              ? "—"
              : sgpa === null
              ? "—"
              : sgpa.toFixed(2)
          }
          note="Credit-weighted · Demo 10-point scale"
          icon={BarChart3}
          onClick={() => setSelectedInsight("progress")}
        />
        <Stat
          label="Enrolled courses"
          value={String(courses.length).padStart(2, "0")}
          note="Open to view your course list"
          icon={BookOpen}
          onClick={() => setSelectedInsight("courses")}
        />
        <Stat
          label="Pending support requests"
          value={
            requests.isLoading
              ? "—"
              : String(pendingRequests.length).padStart(2, "0")
          }
          note="Awaiting faculty confirmation"
          icon={ClipboardList}
          tone="amber"
          onClick={() => setSelectedInsight("requests")}
        />
      </div>

      <div className="dashboard-grid">
        {visibleWidgets.includes("overview") && (
          <Card className="overview-card">
            <div className="panel-heading">
              <div>
                <h2>Academic overview</h2>
                <p>A quick look at your current semester.</p>
              </div>
              <Link to="/student/progress" className="text-link">
                View progress <ArrowRight size={15} />
              </Link>
            </div>

            <div className="gpa-strip">
              <span>SEMESTER GPA</span>
              <strong>{sgpa === null ? "—" : sgpa.toFixed(2)}</strong>
              <small>
                Credit-weighted GPA from available graded courses. Demo grading
                configuration.
              </small>
            </div>

            <div className="course-table">
              <div className="table-head">
                <span>COURSE</span>
                <span>GRADE</span>
                <span>COURSEWORK COMPLETION</span>
              </div>

              {progress.isLoading ? (
                <Spinner label="Loading academic progress…" />
              ) : progress.isError ? (
                <Notice kind="error">
                  Unable to load course progress right now.
                </Notice>
              ) : (
                courses.slice(0, 6).map((course) => (
                  <div key={course.id} className="course-row">
                    <div>
                      <strong>{course.title}</strong>
                      <small>{course.code}</small>
                    </div>
                    <span className="grade-pill">
                      {course.grade ?? "Pending"}
                    </span>
                    <div className="progress-cell">
                      <div className="progress-track">
                        <i
                          style={{
                            width: `${course.academic.completion.percentage ?? 0}%`,
                          }}
                        />
                      </div>
                      <small>
                        {course.academic.completion.percentage === null
                          ? "—"
                          : `${course.academic.completion.percentage}%`}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {visibleWidgets.includes("requests") && (
          <Card>
            <div className="panel-heading">
              <div>
                <h2>Support requests</h2>
                <p>Your recent sessions, all in one place.</p>
              </div>
              <span className="count-pill">{reqs.length}</span>
            </div>

            {requests.isLoading ? (
              <Spinner />
            ) : requests.isError ? (
              <Notice kind="error">
                Unable to load your support requests.
              </Notice>
            ) : reqs.length ? (
              <div className="request-mini-list">
                {reqs.slice(0, 3).map((request) => (
                  <div key={request.id} className="request-mini">
                    <strong>{request.course}</strong>
                    <small>
                      {request.professor} · Requested {request.createdAt}
                    </small>
                    <div>
                      <span>
                        <CalendarDays size={13} /> {request.date} ·{" "}
                        {request.time}
                      </span>
                      <Status status={request.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No support requests yet"
                text="Browse available faculty sessions when you need a little extra support."
              />
            )}

            <Link to="/student/requests" className="panel-bottom-link">
              View all requests <ArrowRight size={15} />
            </Link>
          </Card>
        )}

        {visibleWidgets.includes("activity") && (
          <Card>
            <div className="panel-heading">
              <div>
                <h2>Recent academic activity</h2>
                <p>The latest milestones on your academic journey.</p>
              </div>
              <Link to="/student/history" className="text-link">
                View all
              </Link>
            </div>

            {history.isLoading ? (
              <Spinner />
            ) : history.isError ? (
              <Notice kind="error">Unable to load academic activity.</Notice>
            ) : (
              <div className="activity-list">
                {activities.slice(0, 4).map((item) => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon">
                      {item.kind === "grade" ? (
                        <BarChart3 size={16} />
                      ) : item.kind === "submission" ? (
                        <FileText size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                    <small>{item.date}</small>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {visibleWidgets.includes("nextStep") && (
          <Card>
            <div className="panel-heading">
              <div>
                <h2>Your next step</h2>
                <p>Shortcuts to keep your semester organised.</p>
              </div>
            </div>

            <div className="next-actions">
              <Link to="/student/slots" className="next-action featured">
                <CalendarDays size={17} />
                <span>
                  <strong>Browse Support Slots</strong>
                  <small>Find a time that works for you.</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/student/progress" className="next-action">
                <BarChart3 size={17} />
                <span>
                  <strong>View Academic Progress</strong>
                  <small>See your full academic picture.</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/student/requests" className="next-action">
                <ClipboardList size={17} />
                <span>
                  <strong>Check My Requests</strong>
                  <small>Stay on top of your support sessions.</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        )}

        {visibleWidgets.length === 0 && (
          <Card className="empty-widgets">
            <EmptyState
              title="Your dashboard is minimal"
              text="All optional widgets are hidden. Use Personalise dashboard to add the information you want to see."
              action={
                <button
                  className="button primary"
                  onClick={() => setCustomiseOpen(true)}
                >
                  Choose widgets
                </button>
              }
            />
          </Card>
        )}
      </div>

      {selectedInsight === "progress" && (
        <Modal
          title="Overall academic progress"
          onClose={() => setSelectedInsight(null)}
        >
          <p className="modal-intro">
            Compare assessment performance with coursework completion for each
            tracked course.
          </p>
          <InteractiveCourseChart courses={courses} />
          <Link
            className="button primary"
            to="/student/progress"
            onClick={() => setSelectedInsight(null)}
          >
            Open full academic progress <ArrowRight size={15} />
          </Link>
        </Modal>
      )}

      {selectedInsight === "courses" && (
        <Modal
          title="Enrolled courses"
          onClose={() => setSelectedInsight(null)}
        >
          <p className="modal-intro">
            Courses currently included in your academic record.
          </p>
          <div className="insight-course-list">
            {courses.map((course) => (
              <div key={course.id} className="insight-course">
                <div>
                  <strong>{course.code}</strong>
                  <span>{course.title}</span>
                </div>
                <div>
                  <b>{course.grade ?? "Pending"}</b>
                  <small>
                    {course.academic.completion.percentage === null
                      ? "Completion unavailable"
                      : `${course.academic.completion.percentage}% coursework completed`}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <Notice>
            Credit total is a demo value until course registrations are provided
            by the backend.
          </Notice>
        </Modal>
      )}

      {selectedInsight === "requests" && (
        <Modal
          title="Pending support requests"
          onClose={() => setSelectedInsight(null)}
        >
          <p className="modal-intro">
            Requests currently waiting for faculty confirmation.
          </p>

          {requests.isLoading ? (
            <Spinner />
          ) : pendingRequests.length ? (
            <div className="insight-course-list">
              {pendingRequests.map((request) => (
                <div key={request.id} className="insight-course">
                  <div>
                    <strong>{request.course}</strong>
                    <span>
                      {request.professor} · {request.topic}
                    </span>
                  </div>
                  <div>
                    <Status status={request.status} />
                    <small>
                      {request.date} · {request.time}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No pending requests"
              text="You are up to date. Browse support slots if you need a session."
              action={
                <Link
                  className="button primary"
                  to="/student/slots"
                  onClick={() => setSelectedInsight(null)}
                >
                  Browse support slots
                </Link>
              }
            />
          )}

          <Link
            to="/student/requests"
            className="text-link insight-link"
            onClick={() => setSelectedInsight(null)}
          >
            View request history <ArrowRight size={14} />
          </Link>
        </Modal>
      )}
    </>
  );
}

/* -----------------------------------------
   SUPPORT SLOT BROWSER
------------------------------------------ */

export function SlotBrowser() {
  const queryClient = useQueryClient();

  const slots = useQuery({
    queryKey: ["slots"],
    queryFn: slotsApi.list,
  });

  const [course, setCourse] = useState("All courses");
  const [prof, setProf] = useState("All professors");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState("");
  const [topicError, setTopicError] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      slotsApi.request(
        selected.id,
        topic.trim(),
        `request-${selected.id}-${Date.now()}`
      ),
    onSuccess: () => {
      setSelected(null);
      setTopic("");
      setTopicError("");
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (error) => setError(messageFor(error)),
  });

  const all = Array.isArray(slots.data) ? slots.data : [];
  const courses = [...new Set(all.map((slot) => slot.course))];
  const professors = [...new Set(all.map((slot) => slot.professor))];

  const filtered = all.filter(
    (slot) =>
      slot.status === "OPEN" &&
      (!course || course === "All courses" || slot.course === course) &&
      (!prof || prof === "All professors" || slot.professor === prof) &&
      (!date || slot.date === date)
  );

  return (
    <>
      <PageHeading
        title="Support Slot Browser"
        subtitle="Find an available time to connect with your professor."
        action={
          <Link className="button subtle" to="/student/requests">
            My Requests
          </Link>
        }
      />

      <Card className="filter-card">
        <div className="filters">
          <label>
            Course
            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
            >
              <option>All courses</option>
              {courses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Professor
            <select
              value={prof}
              onChange={(event) => setProf(event.target.value)}
            >
              <option>All professors</option>
              {professors.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <button
            className="clear-link"
            onClick={() => {
              setCourse("All courses");
              setProf("All professors");
              setDate("");
            }}
          >
            Clear filters
          </button>
        </div>
      </Card>

      <Notice>
        Request a time. Your professor will review and confirm the session. A
        request is not confirmed until faculty approval.
      </Notice>

      <Card className="slots-card">
        <div className="panel-heading">
          <div>
            <h2>Available support slots</h2>
            <p>Choose a session that fits your schedule.</p>
          </div>
          <small className="muted">
            {slots.isLoading
              ? "Checking availability…"
              : `${filtered.length} available · ${
                  new Set(filtered.map((slot) => slot.professor)).size
                } professors`}
          </small>
        </div>

        {slots.isLoading ? (
          <div className="skeleton-list">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton-row" />
            ))}
          </div>
        ) : slots.isError ? (
          <EmptyState
            title="We couldn't load support slots"
            text="Your filters are saved. Please try again in a moment."
            action={
              <button className="button primary" onClick={() => slots.refetch()}>
                Try again <ArrowRight size={15} />
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No slots available"
            text="There are no available times matching your filters. Try another date or clear your filters."
            action={
              <button
                className="button primary"
                onClick={() => {
                  setCourse("All courses");
                  setProf("All professors");
                  setDate("");
                }}
              >
                Clear filters <ArrowRight size={15} />
              </button>
            }
          />
        ) : (
          <div className="slots-table">
            <div className="slots-head">
              <span>PROFESSOR & COURSE</span>
              <span>DATE</span>
              <span>TIME</span>
              <span>STATUS</span>
              <span>ACTION</span>
            </div>
            {filtered.map((slot) => (
              <div key={slot.id} className="slot-row">
                <div className="prof-cell">
                  <div className="avatar avatar-sm">
                    {slot.professor.split(" ").slice(-1)[0].slice(0, 1)}
                    {slot.professor.split(" ")[1]?.[0] || ""}
                  </div>
                  <span>
                    <strong>{slot.professor}</strong>
                    <small>
                      {slot.courseCode} · {slot.course}
                    </small>
                  </span>
                </div>
                <span>
                  {new Date(`${slot.date}T12:00:00`).toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </span>
                <span>
                  {slot.startsAt}–{slot.endsAt}
                </span>
                <Status status={slot.status} />
                <button
                  className="button primary small"
                  onClick={() => {
                    setSelected(slot);
                    setTopic("");
                    setTopicError("");
                    setError(null);
                    setSuccess(false);
                  }}
                >
                  Request Slot <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="table-foot">
          <span>All times shown in campus time (IST)</span>
          <span>
            Availability is confirmed by the server when your request is
            submitted.
          </span>
        </div>
      </Card>

      {selected && (
        <Modal
          title="Request this support slot?"
          onClose={() => !mutation.isPending && setSelected(null)}
        >
          <p className="modal-intro">
            Review the details before sending your request to your professor.
          </p>

          <div className="selected-slot">
            <strong>{selected.professor}</strong>
            <small>
              {selected.courseCode} · {selected.course}
            </small>
            <div>
              <span>
                <CalendarDays size={14} /> {selected.date}
              </span>
              <span>
                <Clock3 size={14} /> {selected.startsAt}–{selected.endsAt}
              </span>
            </div>
          </div>

          <label className="field-label">
            What would you like help with?{" "}
            <span className="required-mark">Required</span>
          </label>

          <textarea
            required
            maxLength={500}
            aria-invalid={Boolean(topicError)}
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              if (event.target.value.trim()) setTopicError("");
            }}
            placeholder="Briefly describe the topic you want to discuss…"
            rows={3}
          />

          {topicError && <p className="field-error">{topicError}</p>}

          {error && (
            <Notice kind="error">
              <strong>{error.code}</strong> — {error.message}
            </Notice>
          )}

          <Notice>
            New requests stay Pending until your professor confirms the session.
          </Notice>

          <div className="modal-actions">
            <button
              className="button subtle"
              disabled={mutation.isPending}
              onClick={() => setSelected(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                if (!topic.trim()) {
                  setTopicError(
                    "Please describe what you need help with before submitting."
                  );
                  return;
                }
                setTopicError("");
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Submitting…" : "Confirm Request"}{" "}
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}

      {success && (
        <Modal title="Request submitted" onClose={() => setSuccess(false)}>
          <Notice kind="success">
            Your request was created successfully. Your professor will review it
            before confirming your session.
          </Notice>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={() => setSuccess(false)}
            >
              Done
            </button>
            <Link className="button subtle" to="/student/requests">
              View my requests
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}

/* -----------------------------------------
   MY REQUESTS
------------------------------------------ */

export function MyRequests() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["requests"],
    queryFn: requestsApi.list,
  });

  const cancel = useMutation({
    mutationFn: (id) => requestsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });

  const requestList = Array.isArray(query.data) ? query.data : [];
  const pendingCount = requestList.filter(
    (request) => request.status === "PENDING"
  ).length;
  const confirmedCount = requestList.filter(
    (request) => request.status === "CONFIRMED"
  ).length;
  const rescheduleCount = requestList.filter(
    (request) => request.status === "NEEDS_RESCHEDULE"
  ).length;

  return (
    <>
      <PageHeading
        title="My Requests"
        subtitle="Track the status of your support sessions and manage upcoming appointments."
      />

      <div className="status-summary">
        <div>
          <strong>{query.isLoading ? "—" : pendingCount}</strong>
          <span>Pending</span>
        </div>
        <div>
          <strong>{query.isLoading ? "—" : confirmedCount}</strong>
          <span>Confirmed</span>
        </div>
        <div>
          <strong>{query.isLoading ? "—" : rescheduleCount}</strong>
          <span>Needs reschedule</span>
        </div>
      </div>

      <Card>
        <div className="panel-heading">
          <div>
            <h2>Support session history</h2>
            <p>Every request and its latest server-confirmed status.</p>
          </div>
          <Link className="button primary small" to="/student/slots">
            <Plus size={14} /> New request
          </Link>
        </div>

        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <Notice kind="error">
            Unable to load your requests.{" "}
            <button className="inline-action" onClick={() => query.refetch()}>
              Try again
            </button>
          </Notice>
        ) : requestList.length === 0 ? (
          <EmptyState
            title="No requests yet"
            text="Browse available slots to request a one-to-one support session."
          />
        ) : (
          <div className="data-list">
            {requestList.map((request) => (
              <div key={request.id} className="data-row">
                <div className="data-main">
                  <strong>{request.course}</strong>
                  <span>
                    {request.professor} · {request.topic}
                  </span>
                  <small>
                    <CalendarDays size={13} /> {request.date} · {request.time}
                  </small>
                </div>

                <div className="data-end">
                  <Status status={request.status} />
                  {request.status === "PENDING" && (
                    <button
                      className="button danger-ghost small"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(request.id)}
                    >
                      Cancel request
                    </button>
                  )}
                  {request.status === "NEEDS_RESCHEDULE" && (
                    <Link to="/student/slots" className="button primary small">
                      Find another slot
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
   ACADEMIC PROGRESS
------------------------------------------ */

export function ProgressPage() {
  const { user } = useAuth();

  const semesters = [
    { semester: 3, label: "Semester 3", term: "Fall 2025", asOf: "2025-12-31" },
    { semester: 4, label: "Semester 4", term: "Spring 2026", asOf: "2026-05-31" },
    { semester: 5, label: "Semester 5", term: "Fall 2026", asOf: "" },
  ];

  const [selectedSemester, setSelectedSemester] = useState(5);
  const currentSemester =
    semesters.find((item) => item.semester === selectedSemester) ?? semesters[2];

  const query = useQuery({
    queryKey: ["progress", user?.id, currentSemester.asOf],
    queryFn: () =>
      progressApi.get(user.id, currentSemester.asOf || undefined),
    enabled: Boolean(user?.id),
  });

  const courses = Array.isArray(query.data) ? query.data : [];
  const semesterGPA = calculateWeightedGPA(courses);

  const registeredCredits = courses.reduce(
    (total, course) => total + Math.max(0, course.academic.credits),
    0
  );

  const completionCourses = courses.filter(
    (course) =>
      course.academic.completion.percentage !== null &&
      course.academic.credits > 0
  );

  const completionCredits = completionCourses.reduce(
    (total, course) => total + course.academic.credits,
    0
  );

  const averageCompletion =
    completionCredits > 0
      ? Number(
          (
            completionCourses.reduce(
              (total, course) =>
                total +
                course.academic.completion.percentage * course.academic.credits,
              0
            ) / completionCredits
          ).toFixed(1)
        )
      : null;

  const performanceCourses = courses.filter(
    (course) => course.academic.performance.percentage !== null
  );

  const topCourse = performanceCourses.length
    ? [...performanceCourses].sort(
        (a, b) =>
          (b.academic.performance.percentage ?? -1) -
          (a.academic.performance.percentage ?? -1)
      )[0].code
    : "—";

  const totalEarnedMarks = courses.reduce(
    (sum, course) => sum + course.academic.performance.earnedMarks,
    0
  );

  const totalMaximumMarks = courses.reduce(
    (sum, course) => sum + course.academic.performance.maximumMarks,
    0
  );

  const overallPerformance =
    totalMaximumMarks > 0
      ? Number(((totalEarnedMarks / totalMaximumMarks) * 100).toFixed(1))
      : null;

  return (
    <>
      <PageHeading
        title="Academic Progress"
        subtitle="Explore semester-wise academic performance, coursework completion and recorded assessment results."
      />

      <Card className="semester-selector-card">
        <div className="semester-selector-header">
          <div>
            <h2>Semester performance</h2>
            <p>Choose a semester to view its academic records.</p>
          </div>
          <span className="eyebrow">LAST 3 SEMESTERS</span>
        </div>

        <div className="semester-options">
          {semesters.map((semester) => (
            <button
              key={semester.semester}
              type="button"
              className={
                selectedSemester === semester.semester
                  ? "semester-option active"
                  : "semester-option"
              }
              onClick={() => setSelectedSemester(semester.semester)}
            >
              <span>{semester.label}</span>
              <strong>{semester.term}</strong>
            </button>
          ))}
        </div>
      </Card>

      <Notice>
        The semester records and 10-point grading configuration currently shown
        are illustrative demo data, not verified university records. Registered
        credits are not necessarily earned credits.
      </Notice>

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Notice kind="error">
          Could not load academic progress.{" "}
          <button className="inline-action" onClick={() => query.refetch()}>
            Try again
          </button>
        </Notice>
      ) : (
        <>
          <div className="semester-summary-grid">
            <div>
              <span>Semester GPA</span>
              <strong>
                {semesterGPA === null ? "—" : semesterGPA.toFixed(2)}
              </strong>
            </div>
            <div>
              <span>Registered credits</span>
              <strong>{registeredCredits}</strong>
            </div>
            <div>
              <span>Coursework completion</span>
              <strong>
                {averageCompletion === null ? "—" : `${averageCompletion}%`}
              </strong>
            </div>
          </div>

          <div className="progress-summary-strip">
            <div>
              <span>Courses tracked</span>
              <strong>{courses.length}</strong>
            </div>
            <div>
              <span>Assessment performance</span>
              <strong>
                {overallPerformance === null ? "—" : `${overallPerformance}%`}
              </strong>
            </div>
            <div>
              <span>Top assessment performance</span>
              <strong>{topCourse}</strong>
            </div>
          </div>

          <InteractiveCourseChart courses={courses} />

          <div className="progress-section-heading">
            <div>
              <h2>Course details</h2>
              <p>
                Assessment performance and coursework completion are displayed
                separately.
              </p>
            </div>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              title="No course records available"
              text="Academic records for this semester have not been provided yet."
            />
          ) : (
            <div className="progress-courses">
              {courses.map((course) => (
                <Card key={course.id}>
                  <div className="course-progress-head">
                    <div>
                      <span className="eyebrow">{course.code}</span>
                      <h2>{course.title}</h2>
                    </div>
                    <span className="grade-pill large">
                      {course.grade ?? "Pending"}
                    </span>
                  </div>

                  <div className="course-metric-row">
                    <span>Coursework completion</span>
                    <strong>
                      {course.academic.completion.percentage === null
                        ? "—"
                        : `${course.academic.completion.percentage}%`}
                    </strong>
                  </div>

                  <div className="large-progress">
                    <div className="progress-track">
                      <i
                        style={{
                          width: `${course.academic.completion.percentage ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="course-metric-row">
                    <span>Assessment performance</span>
                    <strong>
                      {course.academic.performance.percentage === null
                        ? "—"
                        : `${course.academic.performance.percentage}%`}
                    </strong>
                  </div>

                  <p className="muted">
                    {course.academic.performance.earnedMarks}/
                    {course.academic.performance.maximumMarks} marks ·{" "}
                    {course.academic.credits} credits
                  </p>

                  <div className="assessment-list">
                    <div className="assessment-heading">
                      <strong>Assessment history</strong>
                      <small>Versioned results</small>
                    </div>

                    {course.assessments.length === 0 ? (
                      <p className="muted">No assessment results recorded yet.</p>
                    ) : (
                      course.assessments.map((assessment, index) => (
                        <div
                          key={`${assessment.title}-${assessment.version}-${index}`}
                          className="assessment-row"
                        >
                          <span>
                            {assessment.title}
                            <small>
                              Recorded {assessment.date} · Version{" "}
                              {assessment.version}
                            </small>
                          </span>
                          <strong>
                            {assessment.score}/{assessment.maxScore}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -----------------------------------------
   ACADEMIC TIMELINE
------------------------------------------ */

export function TimelinePage() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["history", user?.id],
    queryFn: () => progressApi.history(user.id),
    enabled: Boolean(user?.id),
  });

  const activities = Array.isArray(query.data) ? query.data : [];

  return (
    <>
      <PageHeading
        title="Academic Timeline"
        subtitle="A chronological record of important changes to your academic record."
      />

      <Card>
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <Notice kind="error">Unable to load history.</Notice>
        ) : activities.length === 0 ? (
          <EmptyState
            title="No academic activity yet"
            text="Grade updates and academic record changes will appear here."
          />
        ) : (
          <div className="timeline">
            {activities.map((activity) => (
              <div key={activity.id} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <div className="timeline-top">
                    <strong>{activity.title}</strong>
                    <small>{activity.date}</small>
                  </div>
                  <p>{activity.description}</p>
                  {activity.actor && (
                    <span className="actor-label">
                      Recorded by {activity.actor}
                    </span>
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
   STUDENT PROFILE
------------------------------------------ */

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeading
        title="Profile"
        subtitle="Your account information and portal preferences."
      />

      <Card className="profile-card">
        <div className="avatar avatar-xl">{user?.initials}</div>
        <div>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <Status status={user?.role || "STUDENT"} />
        </div>
      </Card>

      <Notice>
        Account roles and permissions are managed by the university
        administrator.
      </Notice>
    </>
  );
}