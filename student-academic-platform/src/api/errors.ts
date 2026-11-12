import axios from "axios";
import type { ApiError } from "../types";
export function readApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.error ? data : { error: "NETWORK_ERROR", message: "The server could not be reached." };
  }
  return { error: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." };
}
export const errorCopy: Record<string, string> = {
  SLOT_ALREADY_CONFIRMED: "This slot has just been confirmed for another student. Choose another available time.",
  REQUEST_NOT_PENDING: "This request is no longer pending. Refresh the page to see its latest status.",
  STUDENT_TIME_CONFLICT: "This student already has a confirmed session at an overlapping time.",
  GRADE_VERSION_CONFLICT: "This grade was updated by someone else. Reload the latest version before correcting it.",
  IDEMPOTENCY_KEY_REUSED: "This submission key was already used with different data. Start a new action.",
  VALIDATION_ERROR: "Some submitted information is invalid. Check the form and try again.",
  UNAUTHENTICATED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "This record could not be found.",
  RATE_LIMITED: "Too many attempts. Wait a moment before trying again.",
  NETWORK_ERROR: "We could not connect to the server. Check your connection and retry."
};
export function messageFor(error: unknown) {
  const parsed = readApiError(error);
  return { code: parsed.error, message: errorCopy[parsed.error] || "The request could not be completed.", alternatives: parsed.suggestedAlternatives || [] };
}
