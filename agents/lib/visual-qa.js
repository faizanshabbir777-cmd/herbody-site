// Visual QA decisions — the human verdict on generated product media.
// data/visual-qa.json is written ONLY by the dashboard (like approvals.json).
// Producers stamp visual_qa_status: "needs_review"; a human pass/fail here is
// what unlocks (or blocks) auto-posting and paid promotion.
import { readJson } from "./state.js";

export const VISUAL_QA_PATH = "data/visual-qa.json";

/** Map of queue-item id → { id, status: "pass"|"fail", by, at, note }. */
export function qaDecisions() {
  const doc = readJson(VISUAL_QA_PATH, { decisions: [] });
  const map = new Map();
  for (const d of doc.decisions || []) {
    if (d && d.id && (d.status === "pass" || d.status === "fail")) map.set(d.id, d);
  }
  return map;
}

/**
 * Resolve the effective visual QA status for a queue item:
 * human decision (pass/fail) wins over the payload's machine status.
 * @param {object} item queue item { id, payload }
 * @param {Map} [decisions] injectable for tests
 */
export function resolveVisualQa(item, decisions = qaDecisions()) {
  const d = decisions.get(item?.id);
  if (d) return d.status; // "pass" | "fail"
  return item?.payload?.visual_qa_status || "not_generated";
}

/** Return a copy of the item with the resolved QA status stamped into the payload. */
export function withResolvedVisualQa(item, decisions = qaDecisions()) {
  const status = resolveVisualQa(item, decisions);
  return { ...item, payload: { ...(item.payload || {}), visual_qa_status: status } };
}
