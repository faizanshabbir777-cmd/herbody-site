// Learning collector — derives normalized learning events from repo state
// (queue payloads, approvals, visual QA, published records, performance labels)
// and appends the new ones to data/learning/events/. No LLM call, no writes
// outside data/learning/. Runs after creative-performance so today's labels
// become performance events in the same fleet run.
import { deriveEvents, recordEvents } from "./lib/learning.js";

const events = deriveEvents();
const fresh = recordEvents(events);
const byType = fresh.reduce((m, e) => ((m[e.type] = (m[e.type] || 0) + 1), m), {});
console.log(
  `[learning-collector] ${fresh.length} new event(s) of ${events.length} derived · ` +
  (Object.entries(byType).map(([k, v]) => `${k}:${v}`).join(" ") || "nothing new")
);
