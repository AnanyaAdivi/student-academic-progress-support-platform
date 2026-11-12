import { createId } from "./ids";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { Activity, CourseProgress, Slot, SupportRequest, User } from "../types";

const users: User[] = [
  { id: "stu-1", name: "Alex Morgan", email: "alex@sau-demo.edu", role: "STUDENT", initials: "AM" },
  { id: "prof-1", name: "Dr. Sarah Chen", email: "s.chen@sau-demo.edu", role: "PROFESSOR", initials: "SC" },
  { id: "admin-1", name: "Platform Administrator", email: "admin@sau-demo.edu", role: "ADMIN", initials: "PA" }
];
const seedSlots: Slot[] = [
  { id: "s1", professorId: "prof-1", professor: "Dr. Sarah Chen", course: "Data Structures & Algorithms", courseCode: "CS 301", date: "2026-11-12", startsAt: "10:00", endsAt: "10:30", status: "OPEN" },
  { id: "s2", professorId: "prof-1", professor: "Dr. Sarah Chen", course: "Data Structures & Algorithms", courseCode: "CS 301", date: "2026-11-12", startsAt: "10:30", endsAt: "11:00", status: "OPEN" },
  { id: "s3", professorId: "prof-2", professor: "Prof. Michael Rivera", course: "Linear Algebra", courseCode: "MATH 204", date: "2026-11-13", startsAt: "14:00", endsAt: "14:30", status: "OPEN" },
  { id: "s4", professorId: "prof-2", professor: "Prof. Michael Rivera", course: "Linear Algebra", courseCode: "MATH 204", date: "2026-11-13", startsAt: "14:30", endsAt: "15:00", status: "OPEN" },
  { id: "s5", professorId: "prof-3", professor: "Prof. Emily Watson", course: "Academic Writing", courseCode: "ENG 210", date: "2026-11-16", startsAt: "11:00", endsAt: "11:30", status: "OPEN" },
  { id: "s6", professorId: "prof-3", professor: "Prof. Emily Watson", course: "Academic Writing", courseCode: "ENG 210", date: "2026-11-16", startsAt: "11:30", endsAt: "12:00", status: "OPEN" }
];
const seedRequests: SupportRequest[] = [
  { id: "r1", slotId: "s1", studentId: "stu-1", student: "Alex Morgan", professor: "Dr. Sarah Chen", course: "Data Structures & Algorithms", topic: "Understanding graph traversal", date: "2026-11-12", time: "10:00–10:30", status: "PENDING", createdAt: "2026-11-10" },
  { id: "r2", slotId: "s3", studentId: "stu-1", student: "Alex Morgan", professor: "Prof. Michael Rivera", course: "Linear Algebra", topic: "Eigenvalues and eigenvectors", date: "2026-11-13", time: "14:00–14:30", status: "CONFIRMED", createdAt: "2026-11-08" },
  { id: "r3", slotId: "s5", studentId: "stu-1", student: "Alex Morgan", professor: "Prof. Emily Watson", course: "Academic Writing", topic: "Structuring a research paper", date: "2026-11-16", time: "11:00–11:30", status: "NEEDS_RESCHEDULE", createdAt: "2026-11-07", needsReschedule: true }
];
const seedProgress: CourseProgress[] = [
  { id: "c1", code: "CS 301", title: "Data Structures & Algorithms", grade: "A−", score: 88, progress: 88, assessments: [{ title: "Assignment 3", score: 19, maxScore: 20, date: "2026-11-10", version: 1 }, { title: "Midterm", score: 42, maxScore: 50, date: "2026-11-02", version: 2 }] },
  { id: "c2", code: "CS 305", title: "Database Management Systems", grade: "B+", score: 76, progress: 76, assessments: [{ title: "SQL Lab", score: 18, maxScore: 20, date: "2026-11-04", version: 1 }] },
  { id: "c3", code: "CS 310", title: "Software Engineering", grade: "A", score: 92, progress: 92, assessments: [{ title: "Project review", score: 46, maxScore: 50, date: "2026-11-06", version: 1 }] },
  { id: "c4", code: "CS 312", title: "Computer Networks", grade: "B", score: 65, progress: 65, assessments: [{ title: "Quiz 2", score: 13, maxScore: 20, date: "2026-11-03", version: 1 }] },
  { id: "c5", code: "MA 301", title: "Applied Mathematics III", grade: "A−", score: 82, progress: 82, assessments: [{ title: "Midterm", score: 41, maxScore: 50, date: "2026-11-02", version: 1 }] },
  { id: "c6", code: "HU 302", title: "Technical Communication", grade: "B+", score: 71, progress: 71, assessments: [{ title: "Presentation", score: 14, maxScore: 20, date: "2026-11-05", version: 1 }] }
];
const seedActivity: Activity[] = [
  { id: "a1", title: "Assignment grade published", description: "Data Structures & Algorithms · Scored 19/20 on Assignment 3.", date: "Today · 9:15 AM", kind: "grade", actor: "Dr. Sarah Chen" },
  { id: "a2", title: "Midterm result updated", description: "Applied Mathematics III · Your midterm grade has been updated.", date: "Nov 02 · 3:40 PM", kind: "grade", actor: "Prof. Michael Rivera" },
  { id: "a3", title: "Academic record updated", description: "Fall 2026 · Semester 5 · All 6 course registrations confirmed.", date: "Nov 01 · 11:20 AM", kind: "record" }
];

type State = { user: User | null; slots: Slot[]; requests: SupportRequest[]; progress: CourseProgress[]; activity: Activity[]; };
const STORAGE = "sap_mock_state";
function state(): State {
  try {
    const saved = localStorage.getItem(STORAGE);
    if (saved) return JSON.parse(saved) as State;
  } catch { /* reset invalid demo state */ }
  return { user: users[0], slots: seedSlots, requests: seedRequests, progress: seedProgress, activity: seedActivity };
}
function save(s: State) { localStorage.setItem(STORAGE, JSON.stringify(s)); }
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: status === 200 ? "OK" : "Error", headers: {}, config };
}
function fail(config: InternalAxiosRequestConfig, code: string, status: number, message: string): AxiosResponse {
  return response(config, { error: code, message, requestId: createId(), suggestedAlternatives: [] }, status);
}
const delay = () => new Promise(r => setTimeout(r, 280));
export const mockAdapter: AxiosAdapter = async config => {
  await delay();
  const s = state();
  const method = (config.method || "get").toLowerCase();
  // Axios keeps the query string in config.url when using a custom adapter.
  // Match routes against the pathname only, so /requests?mine=true reaches
  // the mock GET /requests handler instead of falling through to an empty object.
  const url = (config.url || "").split("?")[0].replace(/^\/+/, "");
  const body = (config.data ? (typeof config.data === "string" ? JSON.parse(config.data) : config.data) : {}) as Record<string, unknown>;
  const urlParts = url.split("/").filter(Boolean); const id = urlParts[urlParts.length - 1] || "";
  let data: unknown = {};
  let status = 200;

  if (url === "auth/login" && method === "post") {
    const role = String(body.role || "STUDENT");
    s.user = users.find(u => u.role === role) || users[0]; save(s); data = { user: s.user };
  } else if (url === "auth/logout" && method === "post") { s.user = null; save(s); data = { success: true };
  } else if (url === "me" && method === "get") { if (!s.user) return fail(config, "UNAUTHENTICATED", 401, "Sign in required"); data = s.user;
  } else if (url === "slots" && method === "get") { data = s.slots.filter(x => x.status === "OPEN");
  } else if (url === "slots" && method === "post") {
    const slot: Slot = { id: createId(), professorId: s.user?.id || "prof-1", professor: s.user?.name || "Professor", course: String(body.course), courseCode: String(body.courseCode || "CS 301"), date: String(body.date), startsAt: String(body.startsAt), endsAt: String(body.endsAt), status: "OPEN" };
    s.slots.unshift(slot); save(s); data = slot; status = 201;
  } else if (url.startsWith("slots/") && method === "delete") {
    const slot = s.slots.find(x => x.id === id); if (slot) slot.status = "CANCELLED"; save(s); data = { success: true };
  } else if (/^slots\/[^/]+\/requests$/.test(url) && method === "post") {
    const slotId = url.split("/")[1]; const slot = s.slots.find(x => x.id === slotId);
    if (!slot || slot.status !== "OPEN" || s.requests.some(r => r.slotId === slotId && r.status === "CONFIRMED")) return fail(config, "SLOT_ALREADY_CONFIRMED", 409, "Slot unavailable");
    const req: SupportRequest = { id: createId(), slotId, studentId: s.user?.id || "stu-1", student: s.user?.name || "Alex Morgan", professor: slot.professor, course: slot.course, topic: String(body.topic || "Academic support"), date: slot.date, time: `${slot.startsAt}–${slot.endsAt}`, status: "PENDING", createdAt: new Date().toISOString() };
    s.requests.unshift(req); save(s); data = req; status = 201;
  } else if (url === "requests" && method === "get") { data = s.requests.filter(r => s.user?.role === "PROFESSOR" ? true : r.studentId === s.user?.id);
  } else if (url.startsWith("requests/") && url.endsWith("/confirm") && method === "post") {
    const req = s.requests.find(r => r.id === url.split("/")[1]);
    if (!req || req.status !== "PENDING") return fail(config, "REQUEST_NOT_PENDING", 409, "Request no longer pending");
    const winner = s.requests.find(r => r.slotId === req.slotId && r.status === "CONFIRMED");
    if (winner) return fail(config, "SLOT_ALREADY_CONFIRMED", 409, "Slot already confirmed");
    req.status = "CONFIRMED"; s.requests.filter(r => r.slotId === req.slotId && r.id !== req.id && r.status === "PENDING").forEach(r => { r.status = "NEEDS_RESCHEDULE"; r.needsReschedule = true; }); save(s); data = req;
  } else if (url.startsWith("requests/") && url.endsWith("/cancel") && method === "post") {
    const req = s.requests.find(r => r.id === url.split("/")[1]); if (req) req.status = "CANCELLED"; save(s); data = req;
  } else if (url.startsWith("requests/") && url.endsWith("/reschedule") && method === "post") {
    const req = s.requests.find(r => r.id === url.split("/")[1]); if (req) { const slot = s.slots.find(x => x.id === String(body.slotId)); if (slot) { req.slotId = slot.id; req.date = slot.date; req.time = `${slot.startsAt}–${slot.endsAt}`; req.status = "PENDING"; req.needsReschedule = false; } } save(s); data = req;
  } else if (url.startsWith("students/") && url.includes("/progress") && method === "get") { data = s.progress;
  } else if (url.startsWith("students/") && url.endsWith("/history") && method === "get") { data = s.activity;
  } else if (url.startsWith("assessments/") && url.endsWith("/grades") && method === "post") { data = { success: true }; status = 201;
  } else if (url.startsWith("grades/") && url.endsWith("/correct") && method === "post") { data = { success: true }; status = 201;
  } else if (url === "admin/audit/verify" && method === "get") { data = { valid: true, checkedEvents: 1248, verifiedAt: new Date().toISOString(), firstBrokenRow: null };
  } else if (url === "admin/users" && method === "get") { data = users.map(u => ({ ...u, active: true, joined: "Aug 2026" }));
  } else { data = {}; }
  save(s);
  return response(config, data, status);
};
