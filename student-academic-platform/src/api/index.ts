import { api } from "./client";
import { keyForIntent, completeIntent } from "./idempotency";
import type { Activity, CourseProgress, Slot, SupportRequest, User } from "../types";

/**
 * Accept both a plain array and common REST response envelopes. Axios only
 * validates the TypeScript type at compile time; it does not validate the
 * shape returned by the server at runtime.
 */
function extractArray<T>(payload: unknown, resource: string): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "requests", "items", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
      if (value && typeof value === "object") {
        try { return extractArray<T>(value, resource); } catch { /* try next envelope key */ }
      }
    }
  }

  throw new TypeError(`Invalid ${resource} response: expected an array or an object containing an array.`);
}

export const authApi = {
  login: async (email: string, password: string, role: string) => (await api.post<{ user: User }>("/auth/login", { email, password, role })).data,
  logout: async () => (await api.post("/auth/logout")).data,
  me: async () => (await api.get<User>("/me")).data
};
export const slotsApi = {
  list: async () => (await api.get<Slot[]>("/slots")).data,
  create: async (payload: Partial<Slot>) => (await api.post<Slot>("/slots", payload, { headers: { "Idempotency-Key": keyForIntent("create-slot-" + JSON.stringify(payload)) } })).data,
  cancel: async (id: string) => (await api.delete(`/slots/${id}`)).data,
  request: async (slotId: string, topic: string, intentId: string) => {
    try { return (await api.post<SupportRequest>(`/slots/${slotId}/requests`, { topic }, { headers: { "Idempotency-Key": keyForIntent(intentId) } })).data; }
    finally { completeIntent(intentId); }
  }
};
export const requestsApi = {
  list: async () => extractArray<SupportRequest>((await api.get<unknown>("/requests?mine=true")).data, "support requests"),
  confirm: async (id: string, intentId: string) => {
    try { return (await api.post<SupportRequest>(`/requests/${id}/confirm`, {}, { headers: { "Idempotency-Key": keyForIntent(intentId) } })).data; }
    finally { completeIntent(intentId); }
  },
  cancel: async (id: string) => (await api.post(`/requests/${id}/cancel`, {}, { headers: { "Idempotency-Key": keyForIntent("cancel-" + id) } })).data,
  reschedule: async (id: string, slotId: string) => (await api.post(`/requests/${id}/reschedule`, { slotId }, { headers: { "Idempotency-Key": keyForIntent("reschedule-" + id + "-" + slotId) } })).data
};
export const progressApi = {
  get: async (studentId: string, asOf?: string) => (await api.get<CourseProgress[]>(`/students/${studentId}/progress`, { params: asOf ? { asOf } : {} })).data,
  history: async (studentId: string) => (await api.get<Activity[]>(`/students/${studentId}/history`)).data,
  recordGrade: async (assessmentId: string, payload: { studentId: string; score: number; reason?: string }) => (await api.post(`/assessments/${assessmentId}/grades`, payload, { headers: { "Idempotency-Key": keyForIntent("grade-" + assessmentId + "-" + JSON.stringify(payload)) } })).data,
  correctGrade: async (gradeId: string, payload: { score: number; reason: string }) => (await api.post(`/grades/${gradeId}/correct`, payload, { headers: { "Idempotency-Key": keyForIntent("correct-" + gradeId + "-" + JSON.stringify(payload)) } })).data
};
export const adminApi = {
  users: async () => (await api.get("/admin/users")).data as Array<User & { active: boolean; joined: string }>,
  verifyAudit: async () => (await api.get("/admin/audit/verify")).data as { valid: boolean; checkedEvents: number; verifiedAt: string; firstBrokenRow: number | null }
};
