import { api } from "./client";
import { keyForIntent, completeIntent } from "./idempotency";
/**
 * Accept both a plain array and common REST response envelopes. Axios only
 * validates the TypeScript type at compile time; it does not validate the
 * shape returned by the server at runtime.
 */
function extractArray(payload, resource) {
    if (Array.isArray(payload))
        return payload;
    if (payload && typeof payload === "object") {
        const record = payload;
        for (const key of ["data", "requests", "items", "results"]) {
            const value = record[key];
            if (Array.isArray(value))
                return value;
            if (value && typeof value === "object") {
                try {
                    return extractArray(value, resource);
                }
                catch { /* try next envelope key */ }
            }
        }
    }
    throw new TypeError(`Invalid ${resource} response: expected an array or an object containing an array.`);
}
export const authApi = {
    login: async (email, password, role) => (await api.post("/auth/login", { email, password, role })).data,
    logout: async () => (await api.post("/auth/logout")).data,
    me: async () => (await api.get("/me")).data
};
export const slotsApi = {
    list: async () => (await api.get("/slots")).data,
    create: async (payload) => (await api.post("/slots", payload, { headers: { "Idempotency-Key": keyForIntent("create-slot-" + JSON.stringify(payload)) } })).data,
    cancel: async (id) => (await api.delete(`/slots/${id}`)).data,
    request: async (slotId, topic, intentId) => {
        try {
            return (await api.post(`/slots/${slotId}/requests`, { topic }, { headers: { "Idempotency-Key": keyForIntent(intentId) } })).data;
        }
        finally {
            completeIntent(intentId);
        }
    }
};
export const requestsApi = {
    list: async () => extractArray((await api.get("/requests?mine=true")).data, "support requests"),
    confirm: async (id, intentId) => {
        try {
            return (await api.post(`/requests/${id}/confirm`, {}, { headers: { "Idempotency-Key": keyForIntent(intentId) } })).data;
        }
        finally {
            completeIntent(intentId);
        }
    },
    cancel: async (id) => (await api.post(`/requests/${id}/cancel`, {}, { headers: { "Idempotency-Key": keyForIntent("cancel-" + id) } })).data,
    reschedule: async (id, slotId) => (await api.post(`/requests/${id}/reschedule`, { slotId }, { headers: { "Idempotency-Key": keyForIntent("reschedule-" + id + "-" + slotId) } })).data
};
export const progressApi = {
    get: async (studentId, asOf) => (await api.get(`/students/${studentId}/progress`, { params: asOf ? { asOf } : {} })).data,
    history: async (studentId) => (await api.get(`/students/${studentId}/history`)).data,
    recordGrade: async (assessmentId, payload) => (await api.post(`/assessments/${assessmentId}/grades`, payload, { headers: { "Idempotency-Key": keyForIntent("grade-" + assessmentId + "-" + JSON.stringify(payload)) } })).data,
    correctGrade: async (gradeId, payload) => (await api.post(`/grades/${gradeId}/correct`, payload, { headers: { "Idempotency-Key": keyForIntent("correct-" + gradeId + "-" + JSON.stringify(payload)) } })).data,
    importGrades: async (payload) => (await api.post("/grades/import", payload, { headers: { "Idempotency-Key": keyForIntent("grade-import-" + JSON.stringify(payload)) } })).data
};
export const adminApi = {
    users: async () => (await api.get("/admin/users")).data,
    verifyAudit: async () => (await api.get("/admin/audit/verify")).data
};
