export type Role = "STUDENT" | "PROFESSOR" | "ADMIN";
export type RequestStatus = "PENDING" | "CONFIRMED" | "NEEDS_RESCHEDULE" | "REJECTED" | "CANCELLED";
export interface User { id: string; name: string; email: string; role: Role; initials: string; }
export interface Slot { id: string; professorId: string; professor: string; course: string; courseCode: string; date: string; startsAt: string; endsAt: string; status: "OPEN" | "CLOSED" | "CANCELLED"; }
export interface SupportRequest { id: string; slotId: string; studentId: string; student: string; professor: string; course: string; topic: string; date: string; time: string; status: RequestStatus; createdAt: string; needsReschedule?: boolean; }
export interface CourseProgress { id: string; code: string; title: string; grade: string; score: number; progress: number; assessments: { title: string; score: number; maxScore: number; date: string; version: number }[]; }
export interface Activity { id: string; title: string; description: string; date: string; kind: "grade" | "submission" | "record" | "slot"; actor?: string; }
export interface ApiError { error: string; message?: string; requestId?: string; suggestedAlternatives?: string[]; }
