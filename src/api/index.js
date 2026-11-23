import { api, isMockMode } from "./client";
import { keyForIntent, completeIntent } from "./idempotency";

function extractArray(payload, resource) {
    if (Array.isArray(payload))
        return payload;
    if (payload && typeof payload === "object") {
        const record = payload;
        for (const key of ["data", "requests", "slots", "items", "results"]) {
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

function makeInitials(name) {
    return (name || "U")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "U";
}

function normalizeUser(raw) {
    if (!raw) return null;
    const u = raw.user ?? raw;
    const name = u.name || u.fullName || u.email || "User";
    return {
        ...u,
        name,
        fullName: u.fullName || name,
        initials: u.initials || makeInitials(name),
    };
}

function formatDatePart(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(0, 10);
}

function formatTimePart(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? String(iso)
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function normalizeSlot(slot) {
    if (!slot) return slot;
    return {
        ...slot,
        professor: slot.professor || slot.professorName || "Faculty",
        course: slot.course || "Academic Support",
        courseCode: slot.courseCode || "SAU",
        date: slot.date || formatDatePart(slot.startTime),
        startsAt: slot.startsAt || formatTimePart(slot.startTime),
        endsAt: slot.endsAt || formatTimePart(slot.endTime),
    };
}

function normalizeRequest(req) {
    if (!req) return req;
    const startStr = formatTimePart(req.startTime);
    const endStr = formatTimePart(req.endTime);
    return {
        ...req,
        student: req.student || req.studentName || "Student",
        professor: req.professor || req.professorName || "Faculty",
        course: req.course || "Academic Support",
        date: req.date || formatDatePart(req.startTime),
        time: req.time || (startStr && endStr ? `${startStr}–${endStr}` : ""),
        needsReschedule: req.needsReschedule ?? req.status === "NEEDS_RESCHEDULE",
    };
}

function toBackendSlotPayload(payload) {
    if (payload.startTime && payload.endTime) {
        return { startTime: payload.startTime, endTime: payload.endTime };
    }
    if (payload.date && payload.startsAt && payload.endsAt) {
        return {
            startTime: new Date(`${payload.date}T${payload.startsAt}:00`).toISOString(),
            endTime: new Date(`${payload.date}T${payload.endsAt}:00`).toISOString(),
        };
    }
    return payload;
}

export const authApi = {
    login: async (email, password, role) => {
        const payload = role ? { email, password, role } : { email, password };
        const data = (await api.post("/auth/login", payload)).data;
        return { ...data, user: normalizeUser(data.user ?? data) };
    },
    logout: async () => (await api.post("/auth/logout")).data,
    me: async () => {
        const data = (await api.get("/me")).data;
        return normalizeUser(data);
    }
};

export const slotsApi = {
    list: async () => {
        const data = (await api.get("/slots")).data;
        return extractArray(data, "slots").map(normalizeSlot);
    },
    create: async (payload) => {
        const body = isMockMode ? payload : toBackendSlotPayload(payload);
        const data = (
            await api.post("/slots", body, {
                headers: { "Idempotency-Key": keyForIntent("create-slot-" + JSON.stringify(body)) }
            })
        ).data;
        return normalizeSlot(data.slot ?? data);
    },
    cancel: async (id) => (await api.delete(`/slots/${id}`)).data,
    request: async (slotId, topic, intentId) => {
        try {
            const data = (
                await api.post(`/slots/${slotId}/requests`, { topic }, {
                    headers: { "Idempotency-Key": keyForIntent(intentId) }
                })
            ).data;
            return normalizeRequest(data.request ?? data);
        }
        finally {
            completeIntent(intentId);
        }
    }
};

export const requestsApi = {
    list: async () =>
        extractArray((await api.get("/requests?mine=true")).data, "support requests").map(normalizeRequest),
    confirm: async (id, intentId) => {
        try {
            return (await api.post(`/requests/${id}/confirm`, {}, { headers: { "Idempotency-Key": keyForIntent(intentId) } })).data;
        }
        finally {
            completeIntent(intentId);
        }
    },
    cancel: async (id) => (await api.post(`/requests/${id}/cancel`, {}, { headers: { "Idempotency-Key": keyForIntent("cancel-" + id) } })).data,
    reschedule: async (id, slotId) =>
        (await api.post(`/requests/${id}/reschedule`, { newSlotId: slotId }, { headers: { "Idempotency-Key": keyForIntent("reschedule-" + id + "-" + slotId) } })).data
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