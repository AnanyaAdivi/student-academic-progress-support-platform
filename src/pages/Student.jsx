import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, BarChart3, ClipboardList, Clock3, FileText, Plus, CheckCircle2, Activity, } from "lucide-react";
import { progressApi, requestsApi, slotsApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Card, EmptyState, Modal, Notice, PageHeading, Spinner, Stat, Status, } from "../components/UI";
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
function SemesterTrendChart({ selectedSemester, onSelect, }) {
    const points = demoSemesterHistory.map((item, index) => ({
        ...item,
        x: 92 + index * 218,
        y: 174 - (item.progress - 55) * 3.1,
    }));
    return (_jsxs("div", { className: "semester-chart-wrap", children: [_jsxs("svg", { className: "semester-chart", viewBox: "0 0 620 230", role: "img", "aria-label": "Academic progress trend across semesters three to five", children: [[60, 70, 80, 90].map((value) => {
                        const y = 174 - (value - 55) * 3.1;
                        return (_jsxs("g", { children: [_jsx("line", { x1: "55", x2: "580", y1: y, y2: y, className: "chart-grid-line" }), _jsxs("text", { x: "38", y: y + 4, className: "chart-axis-label", textAnchor: "end", children: [value, "%"] })] }, value));
                    }), _jsx("polyline", { points: points.map((point) => `${point.x},${point.y}`).join(" "), className: "semester-line" }), points.map((point) => (_jsxs("g", { className: selectedSemester === point.semester
                            ? "chart-point active"
                            : "chart-point", onClick: () => onSelect(point.semester), tabIndex: 0, role: "button", "aria-label": `${point.label}: ${point.progress}%`, onKeyDown: (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                onSelect(point.semester);
                            }
                        }, children: [_jsx("circle", { cx: point.x, cy: point.y, r: selectedSemester === point.semester ? 8 : 6 }), _jsxs("text", { x: point.x, y: "205", textAnchor: "middle", className: "chart-axis-label", children: ["Sem ", point.semester] }), _jsxs("text", { x: point.x, y: point.y - 16, textAnchor: "middle", className: "chart-value-label", children: [point.progress, "%"] })] }, point.semester)))] }), _jsx("div", { className: "chart-selection-hint", children: "Select a point to inspect that semester." })] }));
}
/* -----------------------------------------
   INTERACTIVE MULTI-SERIES LINE CHART
------------------------------------------ */
function InteractiveCourseChart({ courses, }) {
    const [selectedId, setSelectedId] = useState(courses[0]?.id ?? "");
    const selectedCourse = courses.find((course) => course.id === selectedId) ??
        courses[0];
    const width = 760;
    const height = 370;
    const left = 65;
    const right = 35;
    const top = 35;
    const bottom = 85;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const xPosition = (index) => courses.length === 1
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
    const createPath = (points) => points
        .filter((point) => point.value !== null)
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");
    return (_jsxs(Card, { className: "interactive-chart-card", children: [_jsx("div", { className: "panel-heading chart-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "Course performance overview" }), _jsx("p", { children: "Compare coursework completion with assessment performance across your enrolled courses." })] }) }), courses.length === 0 ? (_jsx(EmptyState, { title: "No course data yet", text: "Course performance will appear when academic records are available." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "line-chart-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "legend-line completion-line" }), "Coursework completion"] }), _jsxs("span", { children: [_jsx("i", { className: "legend-line performance-line" }), "Assessment performance"] })] }), _jsx("div", { className: "line-chart-container", children: _jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "course-line-chart", role: "img", "aria-label": "Coursework completion and assessment performance by course", children: [[0, 25, 50, 75, 100].map((value) => {
                                    const y = yPosition(value);
                                    return (_jsxs("g", { children: [_jsx("line", { x1: left, x2: width - right, y1: y, y2: y, className: "chart-grid-line" }), _jsxs("text", { x: left - 12, y: y + 4, textAnchor: "end", className: "chart-axis-label", children: [value, "%"] })] }, value));
                                }), _jsx("path", { d: createPath(completionPoints), className: "course-completion-path" }), _jsx("path", { d: createPath(performancePoints), className: "course-performance-path" }), completionPoints.map((point) => (point.value !== null && (_jsx("g", { className: "line-chart-point", onClick: () => setSelectedId(point.course.id), children: _jsx("circle", { cx: point.x, cy: point.y, r: selectedCourse?.id === point.course.id
                                            ? 7
                                            : 5, className: "completion-dot" }) }, `completion-${point.course.id}`)))), performancePoints.map((point) => (point.value !== null && (_jsx("g", { className: "line-chart-point", onClick: () => setSelectedId(point.course.id), children: _jsx("circle", { cx: point.x, cy: point.y, r: selectedCourse?.id === point.course.id
                                            ? 7
                                            : 5, className: "performance-dot" }) }, `performance-${point.course.id}`)))), courses.map((course, index) => (_jsxs("g", { className: "line-chart-course-label", onClick: () => setSelectedId(course.id), role: "button", tabIndex: 0, onKeyDown: (event) => {
                                        if (event.key === "Enter" ||
                                            event.key === " ") {
                                            setSelectedId(course.id);
                                        }
                                    }, children: [_jsx("text", { x: xPosition(index), y: height - 48, textAnchor: "middle", className: "course-code-label", children: course.code }), _jsx("text", { x: xPosition(index), y: height - 29, textAnchor: "middle", className: "course-name-label", children: course.title.length > 13
                                                ? `${course.title.slice(0, 12)}…`
                                                : course.title })] }, course.id)))] }) }), selectedCourse && (_jsxs("div", { className: "chart-detail", children: [_jsxs("div", { children: [_jsx("span", { className: "eyebrow", children: "SELECTED COURSE" }), _jsx("strong", { children: selectedCourse.title }), _jsxs("small", { children: [selectedCourse.code, " \u00B7 Grade", " ", selectedCourse.grade ?? "Pending"] })] }), _jsxs("div", { className: "chart-detail-metrics", children: [_jsxs("div", { children: [_jsxs("strong", { children: [selectedCourse.academic.completion.percentage ??
                                                        "—", selectedCourse.academic.completion.percentage !==
                                                        null
                                                        ? "%"
                                                        : ""] }), _jsx("span", { children: "Coursework completion" })] }), _jsxs("div", { children: [_jsxs("strong", { children: [selectedCourse.academic.performance.percentage ??
                                                        "—", selectedCourse.academic.performance.percentage !==
                                                        null
                                                        ? "%"
                                                        : ""] }), _jsx("span", { children: "Assessment performance" })] })] })] }))] }))] }));
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
        }
        catch {
            return ["overview", "requests", "activity", "nextStep"];
        }
    });
    useEffect(() => {
        if (!user?.id)
            return;
        window.localStorage.setItem(preferenceKey, JSON.stringify(visibleWidgets));
    }, [preferenceKey, user?.id, visibleWidgets]);
    const courses = Array.isArray(progress.data) ? progress.data : [];
    const reqs = Array.isArray(requests.data) ? requests.data : [];
    const activities = Array.isArray(history.data) ? history.data : [];
    const pendingRequests = reqs.filter((request) => request.status === "PENDING");
    const sgpa = calculateWeightedGPA(courses);
    const currentSemester = demoSemesterHistory.find((item) => item.semester === selectedSemester) ?? demoSemesterHistory[2];
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
        setVisibleWidgets((current) => current.includes(id)
            ? current.filter((widget) => widget !== id)
            : [...current, id]);
    };
    const restoreDefaults = () => {
        setVisibleWidgets(["overview", "requests", "activity", "nextStep"]);
    };
    return (_jsxs(_Fragment, { children: [_jsx(PageHeading, { title: `Welcome back, ${user?.name.split(" ")[0]}.`, subtitle: "Your academic snapshot, priorities and support activity \u2014 organised around what matters to you.", action: _jsxs("div", { className: "dashboard-heading-actions", children: [_jsxs("span", { className: "standing-pill", children: [_jsx("i", {}), " Your semester at a glance"] }), _jsxs("button", { className: "button subtle customise-button", onClick: () => setCustomiseOpen((open) => !open), "aria-expanded": customiseOpen, children: [_jsx(Activity, { size: 14 }), customiseOpen ? "Close settings" : "Personalise dashboard"] })] }) }), customiseOpen && (_jsxs(Card, { className: "customise-panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Make this dashboard yours" }), _jsx("p", { children: "Choose the academic widgets you want to see. Your choices are saved on this device." })] }), _jsx("button", { className: "clear-link", onClick: restoreDefaults, children: "Restore defaults" })] }), _jsx("div", { className: "widget-preferences", children: widgetOptions.map((widget) => (_jsxs("label", { className: "widget-preference", children: [_jsx("input", { type: "checkbox", checked: visibleWidgets.includes(widget.id), onChange: () => toggleWidget(widget.id) }), _jsxs("span", { children: [_jsx("strong", { children: widget.title }), _jsx("small", { children: widget.description })] })] }, widget.id))) }), _jsx("div", { className: "preference-footnote", children: "Core information \u2014 semester, academic progress, enrolled courses and pending requests \u2014 remains available regardless of these settings." })] })), _jsxs("div", { className: "stats-grid", children: [_jsx(Stat, { label: "Current semester", value: "05", note: "Fall 2026 \u00B7 Aug \u2013 Dec", icon: CalendarDays, onClick: () => navigate("/student/progress") }), _jsx(Stat, { label: "Semester GPA", value: progress.isLoading || progress.isError
                            ? "—"
                            : sgpa === null ? "—" : sgpa.toFixed(2), note: "Credit-weighted \u00B7 Demo 10-point scale", icon: BarChart3, onClick: () => setSelectedInsight("progress") }), _jsx(Stat, { label: "Enrolled courses", value: String(courses.length).padStart(2, "0"), note: "Open to view your course list", icon: BookOpen, onClick: () => setSelectedInsight("courses") }), _jsx(Stat, { label: "Pending support requests", value: requests.isLoading
                            ? "—"
                            : String(pendingRequests.length).padStart(2, "0"), note: "Awaiting faculty confirmation", icon: ClipboardList, tone: "amber", onClick: () => setSelectedInsight("requests") })] }), _jsxs("div", { className: "dashboard-grid", children: [visibleWidgets.includes("overview") && (_jsxs(Card, { className: "overview-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Academic overview" }), _jsx("p", { children: "A quick look at your current semester." })] }), _jsxs(Link, { to: "/student/progress", className: "text-link", children: ["View progress ", _jsx(ArrowRight, { size: 15 })] })] }), _jsxs("div", { className: "gpa-strip", children: [_jsx("span", { children: "SEMESTER GPA" }), _jsx("strong", { children: sgpa === null ? "—" : sgpa.toFixed(2) }), _jsx("small", { children: "Credit-weighted GPA from available graded courses. Demo grading configuration." })] }), _jsxs("div", { className: "course-table", children: [_jsxs("div", { className: "table-head", children: [_jsx("span", { children: "COURSE" }), _jsx("span", { children: "GRADE" }), _jsx("span", { children: "COURSEWORK COMPLETION" })] }), progress.isLoading ? (_jsx(Spinner, { label: "Loading academic progress\u2026" })) : progress.isError ? (_jsx(Notice, { kind: "error", children: "Unable to load course progress right now." })) : (courses.slice(0, 6).map((course) => (_jsxs("div", { className: "course-row", children: [_jsxs("div", { children: [_jsx("strong", { children: course.title }), _jsx("small", { children: course.code })] }), _jsx("span", { className: "grade-pill", children: course.grade ?? "Pending" }), _jsxs("div", { className: "progress-cell", children: [_jsx("div", { className: "progress-track", children: _jsx("i", { style: { width: `${course.academic.completion.percentage ?? 0}%` } }) }), _jsx("small", { children: course.academic.completion.percentage === null
                                                            ? "—"
                                                            : `${course.academic.completion.percentage}%` })] })] }, course.id))))] })] })), visibleWidgets.includes("requests") && (_jsxs(Card, { children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Support requests" }), _jsx("p", { children: "Your recent sessions, all in one place." })] }), _jsx("span", { className: "count-pill", children: reqs.length })] }), requests.isLoading ? (_jsx(Spinner, {})) : requests.isError ? (_jsx(Notice, { kind: "error", children: "Unable to load your support requests." })) : reqs.length ? (_jsx("div", { className: "request-mini-list", children: reqs.slice(0, 3).map((request) => (_jsxs("div", { className: "request-mini", children: [_jsx("strong", { children: request.course }), _jsxs("small", { children: [request.professor, " \u00B7 Requested ", request.createdAt] }), _jsxs("div", { children: [_jsxs("span", { children: [_jsx(CalendarDays, { size: 13 }), " ", request.date, " \u00B7", " ", request.time] }), _jsx(Status, { status: request.status })] })] }, request.id))) })) : (_jsx(EmptyState, { title: "No support requests yet", text: "Browse available faculty sessions when you need a little extra support." })), _jsxs(Link, { to: "/student/requests", className: "panel-bottom-link", children: ["View all requests ", _jsx(ArrowRight, { size: 15 })] })] })), visibleWidgets.includes("activity") && (_jsxs(Card, { children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Recent academic activity" }), _jsx("p", { children: "The latest milestones on your academic journey." })] }), _jsx(Link, { to: "/student/history", className: "text-link", children: "View all" })] }), history.isLoading ? (_jsx(Spinner, {})) : history.isError ? (_jsx(Notice, { kind: "error", children: "Unable to load academic activity." })) : (_jsx("div", { className: "activity-list", children: activities.slice(0, 4).map((item) => (_jsxs("div", { className: "activity-item", children: [_jsx("div", { className: "activity-icon", children: item.kind === "grade" ? (_jsx(BarChart3, { size: 16 })) : item.kind === "submission" ? (_jsx(FileText, { size: 16 })) : (_jsx(CheckCircle2, { size: 16 })) }), _jsxs("div", { children: [_jsx("strong", { children: item.title }), _jsx("p", { children: item.description })] }), _jsx("small", { children: item.date })] }, item.id))) }))] })), visibleWidgets.includes("nextStep") && (_jsxs(Card, { children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "Your next step" }), _jsx("p", { children: "Shortcuts to keep your semester organised." })] }) }), _jsxs("div", { className: "next-actions", children: [_jsxs(Link, { to: "/student/slots", className: "next-action featured", children: [_jsx(CalendarDays, { size: 17 }), _jsxs("span", { children: [_jsx("strong", { children: "Browse Support Slots" }), _jsx("small", { children: "Find a time that works for you." })] }), _jsx(ArrowRight, { size: 16 })] }), _jsxs(Link, { to: "/student/progress", className: "next-action", children: [_jsx(BarChart3, { size: 17 }), _jsxs("span", { children: [_jsx("strong", { children: "View Academic Progress" }), _jsx("small", { children: "See your full academic picture." })] }), _jsx(ArrowRight, { size: 16 })] }), _jsxs(Link, { to: "/student/requests", className: "next-action", children: [_jsx(ClipboardList, { size: 17 }), _jsxs("span", { children: [_jsx("strong", { children: "Check My Requests" }), _jsx("small", { children: "Stay on top of your support sessions." })] }), _jsx(ArrowRight, { size: 16 })] })] })] })), visibleWidgets.length === 0 && (_jsx(Card, { className: "empty-widgets", children: _jsx(EmptyState, { title: "Your dashboard is minimal", text: "All optional widgets are hidden. Use Personalise dashboard to add the information you want to see.", action: _jsx("button", { className: "button primary", onClick: () => setCustomiseOpen(true), children: "Choose widgets" }) }) }))] }), selectedInsight === "progress" && (_jsxs(Modal, { title: "Overall academic progress", onClose: () => setSelectedInsight(null), children: [_jsx("p", { className: "modal-intro", children: "Compare assessment performance with coursework completion for each tracked course." }), _jsx(InteractiveCourseChart, { courses: courses }), _jsxs(Link, { className: "button primary", to: "/student/progress", onClick: () => setSelectedInsight(null), children: ["Open full academic progress ", _jsx(ArrowRight, { size: 15 })] })] })), selectedInsight === "courses" && (_jsxs(Modal, { title: "Enrolled courses", onClose: () => setSelectedInsight(null), children: [_jsx("p", { className: "modal-intro", children: "Courses currently included in your academic record." }), _jsx("div", { className: "insight-course-list", children: courses.map((course) => (_jsxs("div", { className: "insight-course", children: [_jsxs("div", { children: [_jsx("strong", { children: course.code }), _jsx("span", { children: course.title })] }), _jsxs("div", { children: [_jsx("b", { children: course.grade ?? "Pending" }), _jsx("small", { children: course.academic.completion.percentage === null
                                                ? "Completion unavailable"
                                                : `${course.academic.completion.percentage}% coursework completed` })] })] }, course.id))) }), _jsx(Notice, { children: "Credit total is a demo value until course registrations are provided by the backend." })] })), selectedInsight === "requests" && (_jsxs(Modal, { title: "Pending support requests", onClose: () => setSelectedInsight(null), children: [_jsx("p", { className: "modal-intro", children: "Requests currently waiting for faculty confirmation." }), requests.isLoading ? (_jsx(Spinner, {})) : pendingRequests.length ? (_jsx("div", { className: "insight-course-list", children: pendingRequests.map((request) => (_jsxs("div", { className: "insight-course", children: [_jsxs("div", { children: [_jsx("strong", { children: request.course }), _jsxs("span", { children: [request.professor, " \u00B7 ", request.topic] })] }), _jsxs("div", { children: [_jsx(Status, { status: request.status }), _jsxs("small", { children: [request.date, " \u00B7 ", request.time] })] })] }, request.id))) })) : (_jsx(EmptyState, { title: "No pending requests", text: "You are up to date. Browse support slots if you need a session.", action: _jsx(Link, { className: "button primary", to: "/student/slots", onClick: () => setSelectedInsight(null), children: "Browse support slots" }) })), _jsxs(Link, { to: "/student/requests", className: "text-link insight-link", onClick: () => setSelectedInsight(null), children: ["View request history ", _jsx(ArrowRight, { size: 14 })] })] }))] }));
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
        mutationFn: () => slotsApi.request(selected.id, topic.trim(), `request-${selected.id}-${Date.now()}`),
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
    const filtered = all.filter((slot) => slot.status === "OPEN" &&
        (!course || course === "All courses" || slot.course === course) &&
        (!prof || prof === "All professors" || slot.professor === prof) &&
        (!date || slot.date === date));
    return (_jsxs(_Fragment, { children: [_jsx(PageHeading, { title: "Support Slot Browser", subtitle: "Find an available time to connect with your professor.", action: _jsx(Link, { className: "button subtle", to: "/student/requests", children: "My Requests" }) }), _jsx(Card, { className: "filter-card", children: _jsxs("div", { className: "filters", children: [_jsxs("label", { children: ["Course", _jsxs("select", { value: course, onChange: (event) => setCourse(event.target.value), children: [_jsx("option", { children: "All courses" }), courses.map((item) => (_jsx("option", { children: item }, item)))] })] }), _jsxs("label", { children: ["Professor", _jsxs("select", { value: prof, onChange: (event) => setProf(event.target.value), children: [_jsx("option", { children: "All professors" }), professors.map((item) => (_jsx("option", { children: item }, item)))] })] }), _jsxs("label", { children: ["Date", _jsx("input", { type: "date", value: date, onChange: (event) => setDate(event.target.value) })] }), _jsx("button", { className: "clear-link", onClick: () => {
                                setCourse("All courses");
                                setProf("All professors");
                                setDate("");
                            }, children: "Clear filters" })] }) }), _jsx(Notice, { children: "Request a time. Your professor will review and confirm the session. A request is not confirmed until faculty approval." }), _jsxs(Card, { className: "slots-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Available support slots" }), _jsx("p", { children: "Choose a session that fits your schedule." })] }), _jsx("small", { className: "muted", children: slots.isLoading
                                    ? "Checking availability…"
                                    : `${filtered.length} available · ${new Set(filtered.map((slot) => slot.professor)).size} professors` })] }), slots.isLoading ? (_jsx("div", { className: "skeleton-list", children: [1, 2, 3, 4].map((item) => (_jsx("div", { className: "skeleton-row" }, item))) })) : slots.isError ? (_jsx(EmptyState, { title: "We couldn't load support slots", text: "Your filters are saved. Please try again in a moment.", action: _jsxs("button", { className: "button primary", onClick: () => slots.refetch(), children: ["Try again ", _jsx(ArrowRight, { size: 15 })] }) })) : filtered.length === 0 ? (_jsx(EmptyState, { title: "No slots available", text: "There are no available times matching your filters. Try another date or clear your filters.", action: _jsxs("button", { className: "button primary", onClick: () => {
                                setCourse("All courses");
                                setProf("All professors");
                                setDate("");
                            }, children: ["Clear filters ", _jsx(ArrowRight, { size: 15 })] }) })) : (_jsxs("div", { className: "slots-table", children: [_jsxs("div", { className: "slots-head", children: [_jsx("span", { children: "PROFESSOR & COURSE" }), _jsx("span", { children: "DATE" }), _jsx("span", { children: "TIME" }), _jsx("span", { children: "STATUS" }), _jsx("span", { children: "ACTION" })] }), filtered.map((slot) => (_jsxs("div", { className: "slot-row", children: [_jsxs("div", { className: "prof-cell", children: [_jsxs("div", { className: "avatar avatar-sm", children: [slot.professor.split(" ").slice(-1)[0].slice(0, 1), slot.professor.split(" ")[1]?.[0] || ""] }), _jsxs("span", { children: [_jsx("strong", { children: slot.professor }), _jsxs("small", { children: [slot.courseCode, " \u00B7 ", slot.course] })] })] }), _jsx("span", { children: new Date(`${slot.date}T12:00:00`).toLocaleDateString("en-IN", {
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        }) }), _jsxs("span", { children: [slot.startsAt, "\u2013", slot.endsAt] }), _jsx(Status, { status: slot.status }), _jsxs("button", { className: "button primary small", onClick: () => {
                                            setSelected(slot);
                                            setTopic("");
                                            setTopicError("");
                                            setError(null);
                                            setSuccess(false);
                                        }, children: ["Request Slot ", _jsx(ArrowRight, { size: 14 })] })] }, slot.id)))] })), _jsxs("div", { className: "table-foot", children: [_jsx("span", { children: "All times shown in campus time (IST)" }), _jsx("span", { children: "Availability is confirmed by the server when your request is submitted." })] })] }), selected && (_jsxs(Modal, { title: "Request this support slot?", onClose: () => !mutation.isPending && setSelected(null), children: [_jsx("p", { className: "modal-intro", children: "Review the details before sending your request to your professor." }), _jsxs("div", { className: "selected-slot", children: [_jsx("strong", { children: selected.professor }), _jsxs("small", { children: [selected.courseCode, " \u00B7 ", selected.course] }), _jsxs("div", { children: [_jsxs("span", { children: [_jsx(CalendarDays, { size: 14 }), " ", selected.date] }), _jsxs("span", { children: [_jsx(Clock3, { size: 14 }), " ", selected.startsAt, "\u2013", selected.endsAt] })] })] }), _jsxs("label", { className: "field-label", children: ["What would you like help with?", " ", _jsx("span", { className: "required-mark", children: "Required" })] }), _jsx("textarea", { required: true, maxLength: 500, "aria-invalid": Boolean(topicError), value: topic, onChange: (event) => {
                            setTopic(event.target.value);
                            if (event.target.value.trim())
                                setTopicError("");
                        }, placeholder: "Briefly describe the topic you want to discuss\u2026", rows: 3 }), topicError && _jsx("p", { className: "field-error", children: topicError }), error && (_jsxs(Notice, { kind: "error", children: [_jsx("strong", { children: error.code }), " \u2014 ", error.message] })), _jsx(Notice, { children: "New requests stay Pending until your professor confirms the session." }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "button subtle", disabled: mutation.isPending, onClick: () => setSelected(null), children: "Cancel" }), _jsxs("button", { className: "button primary", onClick: () => {
                                    if (!topic.trim()) {
                                        setTopicError("Please describe what you need help with before submitting.");
                                        return;
                                    }
                                    setTopicError("");
                                    mutation.mutate();
                                }, disabled: mutation.isPending, children: [mutation.isPending ? "Submitting…" : "Confirm Request", " ", _jsx(ArrowRight, { size: 15 })] })] })] })), success && (_jsxs(Modal, { title: "Request submitted", onClose: () => setSuccess(false), children: [_jsx(Notice, { kind: "success", children: "Your request was created successfully. Your professor will review it before confirming your session." }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "button primary", onClick: () => setSuccess(false), children: "Done" }), _jsx(Link, { className: "button subtle", to: "/student/requests", children: "View my requests" })] })] }))] }));
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
    const pendingCount = requestList.filter((request) => request.status === "PENDING").length;
    const confirmedCount = requestList.filter((request) => request.status === "CONFIRMED").length;
    const rescheduleCount = requestList.filter((request) => request.status === "NEEDS_RESCHEDULE").length;
    return (_jsxs(_Fragment, { children: [_jsx(PageHeading, { title: "My Requests", subtitle: "Track the status of your support sessions and manage upcoming appointments." }), _jsxs("div", { className: "status-summary", children: [_jsxs("div", { children: [_jsx("strong", { children: query.isLoading ? "—" : pendingCount }), _jsx("span", { children: "Pending" })] }), _jsxs("div", { children: [_jsx("strong", { children: query.isLoading ? "—" : confirmedCount }), _jsx("span", { children: "Confirmed" })] }), _jsxs("div", { children: [_jsx("strong", { children: query.isLoading ? "—" : rescheduleCount }), _jsx("span", { children: "Needs reschedule" })] })] }), _jsxs(Card, { children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Support session history" }), _jsx("p", { children: "Every request and its latest server-confirmed status." })] }), _jsxs(Link, { className: "button primary small", to: "/student/slots", children: [_jsx(Plus, { size: 14 }), " New request"] })] }), query.isLoading ? (_jsx(Spinner, {})) : query.isError ? (_jsxs(Notice, { kind: "error", children: ["Unable to load your requests.", " ", _jsx("button", { className: "inline-action", onClick: () => query.refetch(), children: "Try again" })] })) : requestList.length === 0 ? (_jsx(EmptyState, { title: "No requests yet", text: "Browse available slots to request a one-to-one support session." })) : (_jsx("div", { className: "data-list", children: requestList.map((request) => (_jsxs("div", { className: "data-row", children: [_jsxs("div", { className: "data-main", children: [_jsx("strong", { children: request.course }), _jsxs("span", { children: [request.professor, " \u00B7 ", request.topic] }), _jsxs("small", { children: [_jsx(CalendarDays, { size: 13 }), " ", request.date, " \u00B7 ", request.time] })] }), _jsxs("div", { className: "data-end", children: [_jsx(Status, { status: request.status }), request.status === "PENDING" && (_jsx("button", { className: "button danger-ghost small", disabled: cancel.isPending, onClick: () => cancel.mutate(request.id), children: "Cancel request" })), request.status === "NEEDS_RESCHEDULE" && (_jsx(Link, { to: "/student/slots", className: "button primary small", children: "Find another slot" }))] })] }, request.id))) }))] })] }));
}
export function ProgressPage() {
    const { user } = useAuth();
const semesters = [
    { semester: 3, label: "Semester 3", term: "Fall 2025", asOf: "2025-12-31" },
    { semester: 4, label: "Semester 4", term: "Spring 2026", asOf: "2026-05-31" },
    { semester: 5, label: "Semester 5", term: "Fall 2026", asOf: "" },
];
const [selectedSemester, setSelectedSemester] = useState(5);
const currentSemester = semesters.find((item) => item.semester === selectedSemester) ?? semesters[2];
const query = useQuery({
    queryKey: ["progress", user?.id, currentSemester.asOf],
    queryFn: () => progressApi.get(user.id, currentSemester.asOf || undefined),
    enabled: Boolean(user?.id),
});
const courses = Array.isArray(query.data) ? query.data : [];
const semesterGPA = calculateWeightedGPA(courses);
const registeredCredits = courses.reduce((total, course) => total + Math.max(0, course.academic.credits), 0);
const completionCourses = courses.filter((course) => course.academic.completion.percentage !== null && course.academic.credits > 0);
const completionCredits = completionCourses.reduce((total, course) => total + course.academic.credits, 0);
const averageCompletion = completionCredits > 0
    ? Number((completionCourses.reduce((total, course) => total + course.academic.completion.percentage * course.academic.credits, 0) / completionCredits).toFixed(1))
    : null;
const performanceCourses = courses.filter((course) => course.academic.performance.percentage !== null);
const topCourse = performanceCourses.length
    ? [...performanceCourses].sort((a, b) => (b.academic.performance.percentage ?? -1) -
        (a.academic.performance.percentage ?? -1))[0].code
    : "—";
const totalEarnedMarks = courses.reduce((sum, course) => sum + course.academic.performance.earnedMarks, 0);
const totalMaximumMarks = courses.reduce((sum, course) => sum + course.academic.performance.maximumMarks, 0);
const overallPerformance = totalMaximumMarks > 0
    ? Number(((totalEarnedMarks / totalMaximumMarks) * 100).toFixed(1))
    : null;
return (_jsxs(_Fragment, { children: [_jsx(PageHeading, { title: "Academic Progress", subtitle: "Explore semester-wise academic performance, coursework completion and recorded assessment results." }), _jsxs(Card, { className: "semester-selector-card", children: [_jsxs("div", { className: "semester-selector-header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Semester performance" }), _jsx("p", { children: "Choose a semester to view its academic records." })] }), _jsx("span", { className: "eyebrow", children: "LAST 3 SEMESTERS" })] }), _jsx("div", { className: "semester-options", children: semesters.map((semester) => (_jsxs("button", { type: "button", className: selectedSemester === semester.semester ? "semester-option active" : "semester-option", onClick: () => setSelectedSemester(semester.semester), children: [_jsx("span", { children: semester.label }), _jsx("strong", { children: semester.term })] }, semester.semester))) })] }), _jsx(Notice, { children: "The semester records and 10-point grading configuration currently shown are illustrative demo data, not verified university records. Registered credits are not necessarily earned credits." }), query.isLoading ? (_jsx(Spinner, {})) : query.isError ? (_jsxs(Notice, { kind: "error", children: ["Could not load academic progress. ", " ", _jsx("button", { className: "inline-action", onClick: () => query.refetch(), children: "Try again" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "semester-summary-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "Semester GPA" }), _jsx("strong", { children: semesterGPA === null ? "—" : semesterGPA.toFixed(2) })] }), _jsxs("div", { children: [_jsx("span", { children: "Registered credits" }), _jsx("strong", { children: registeredCredits })] }), _jsxs("div", { children: [_jsx("span", { children: "Coursework completion" }), _jsx("strong", { children: averageCompletion === null ? "—" : `${averageCompletion}%` })] })] }), _jsxs("div", { className: "progress-summary-strip", children: [_jsxs("div", { children: [_jsx("span", { children: "Courses tracked" }), _jsx("strong", { children: courses.length })] }), _jsxs("div", { children: [_jsx("span", { children: "Assessment performance" }), _jsx("strong", { children: overallPerformance === null ? "—" : `${overallPerformance}%` })] }), _jsxs("div", { children: [_jsx("span", { children: "Top assessment performance" }), _jsx("strong", { children: topCourse })] })] }), _jsx(InteractiveCourseChart, { courses: courses }), _jsx("div", { className: "progress-section-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "Course details" }), _jsx("p", { children: "Assessment performance and coursework completion are displayed separately." })] }) }), courses.length === 0 ? (_jsx(EmptyState, { title: "No course records available", text: "Academic records for this semester have not been provided yet." })) : (_jsx("div", { className: "progress-courses", children: courses.map((course) => (_jsxs(Card, { children: [_jsxs("div", { className: "course-progress-head", children: [_jsxs("div", { children: [_jsx("span", { className: "eyebrow", children: course.code }), _jsx("h2", { children: course.title })] }), _jsx("span", { className: "grade-pill large", children: course.grade ?? "Pending" })] }), _jsxs("div", { className: "course-metric-row", children: [_jsx("span", { children: "Coursework completion" }), _jsx("strong", { children: course.academic.completion.percentage === null
                                            ? "—"
                                            : `${course.academic.completion.percentage}%` })] }), _jsx("div", { className: "large-progress", children: _jsx("div", { className: "progress-track", children: _jsx("i", { style: { width: `${course.academic.completion.percentage ?? 0}%` } }) }) }), _jsxs("div", { className: "course-metric-row", children: [_jsx("span", { children: "Assessment performance" }), _jsx("strong", { children: course.academic.performance.percentage === null
                                            ? "—"
                                            : `${course.academic.performance.percentage}%` })] }), _jsxs("p", { className: "muted", children: [course.academic.performance.earnedMarks, "/", course.academic.performance.maximumMarks, " marks \u00B7 ", course.academic.credits, " credits"] }), _jsxs("div", { className: "assessment-list", children: [_jsxs("div", { className: "assessment-heading", children: [_jsx("strong", { children: "Assessment history" }), _jsx("small", { children: "Versioned results" })] }), course.assessments.length === 0 ? (_jsx("p", { className: "muted", children: "No assessment results recorded yet." })) : (course.assessments.map((assessment, index) => (_jsxs("div", { className: "assessment-row", children: [_jsxs("span", { children: [assessment.title, _jsxs("small", { children: ["Recorded ", assessment.date, " \u00B7 Version ", assessment.version] })] }), _jsxs("strong", { children: [assessment.score, "/", assessment.maxScore] })] }, `${assessment.title}-${assessment.version}-${index}`))))] })] }, course.id))) }))] }))] }));
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
    return (_jsxs(_Fragment, { children: [_jsx(PageHeading, { title: "Academic Timeline", subtitle: "A chronological record of important changes to your academic record." }), _jsx(Card, { children: query.isLoading ? (_jsx(Spinner, {})) : query.isError ? (_jsx(Notice, { kind: "error", children: "Unable to load history." })) : activities.length === 0 ? (_jsx(EmptyState, { title: "No academic activity yet", text: "Grade updates and academic record changes will appear here." })) : (_jsx("div", { className: "timeline", children: activities.map((activity) => (_jsxs("div", { className: "timeline-item", children: [_jsx("div", { className: "timeline-dot" }), _jsxs("div", { children: [_jsxs("div", { className: "timeline-top", children: [_jsx("strong", { children: activity.title }), _jsx("small", { children: activity.date })] }), _jsx("p", { children: activity.description }), activity.actor && (_jsxs("span", { className: "actor-label", children: ["Recorded by ", activity.actor] }))] })] }, activity.id))) })) })] }));
}
/* -----------------------------------------
   STUDENT PROFILE
------------------------------------------ */
export function ProfilePage() {
    const { user } = useAuth();
    return (_jsxs(_Fragment, { children: [_jsx(PageHeading, { title: "Profile", subtitle: "Your account information and portal preferences." }), _jsxs(Card, { className: "profile-card", children: [_jsx("div", { className: "avatar avatar-xl", children: user?.initials }), _jsxs("div", { children: [_jsx("h2", { children: user?.name }), _jsx("p", { children: user?.email }), _jsx(Status, { status: user?.role || "STUDENT" })] })] }), _jsx(Notice, { children: "Account roles and permissions are managed by the university administrator." })] }));
}
