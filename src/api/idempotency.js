import { createId } from "./ids";
const intentKeys = new Map();
export function keyForIntent(intentId) {
    if (!intentKeys.has(intentId))
        intentKeys.set(intentId, createId());
    return intentKeys.get(intentId);
}
export function completeIntent(intentId) { intentKeys.delete(intentId); }
