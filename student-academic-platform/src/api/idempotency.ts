import { createId } from "./ids";
const intentKeys = new Map<string, string>();
export function keyForIntent(intentId: string): string {
  if (!intentKeys.has(intentId)) intentKeys.set(intentId, createId());
  return intentKeys.get(intentId)!;
}
export function completeIntent(intentId: string) { intentKeys.delete(intentId); }
