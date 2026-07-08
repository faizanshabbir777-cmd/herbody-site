// Learn — turns the event log into lessons, learned negatives, schedule hints,
// experiments and meta-metrics. Mechanical daily (no LLM); with --weekly (or on
// Mondays) one Claude call writes a human-readable narrative from the AGGREGATES
// (numbers only — no raw platform text, so no new injection surface).
// GUARDRAIL: writes only advisory inputs under data/learning/ + data/metrics/learning/.
import { readJson, writeJson, today, nowIso } from "./lib/state.js";
import { queueItems } from "./lib/queue.js";
import {
  loadEvents, aggregateEvents, numericAggregates, candidateLessons, updateLessons,
  updateLearnedNegatives, chooseByPerformance, updateExperiments, metaMetrics,
  SLOTS, LESSONS_PATH, NEGATIVES_PATH, EXPERIMENTS_PATH, HINTS_PATH, META_PATH,
} from "./lib/learning.js";

const WEEKLY = process.argv.includes("--weekly") || new Date().getDay() === 1;

const events = loadEvents();
const aggregates = aggregateEvents(events);

// ---- lessons: confirm / contradict / decay / retire ----
const store = readJson(LESSONS_PATH, { lessons: [] });
const updated = updateLessons(store, candidateLessons(aggregates), today());
updated.aggregates = aggregates; // numbers-only snapshot for the weekly narrative + dashboard

// ---- learned negative prompts from vision failures ----
const negatives = updateLearnedNegatives(readJson(NEGATIVES_PATH, { phrases: [] }), aggregates.vision_fail_reasons, today());
writeJson(NEGATIVES_PATH, negatives);

// ---- schedule hints (epsilon-greedy exploit/explore) ----
// Performance buckets are ground truth; approvals stand in until they exist.
const withFallback = (perf = {}, approvals = {}) =>
  Object.values(perf).some((b) => b.pos + b.neg > 0) ? perf : approvals;
const slotBuckets = withFallback(aggregates.by_slot, aggregates.approval_by_slot);
const pillarBuckets = withFallback(aggregates.by_pillar, aggregates.approval_by_pillar);
const pillars = [...new Set(Object.keys(pillarBuckets))];
const slotPick = chooseByPerformance(slotBuckets, SLOTS);
const pillarPick = chooseByPerformance(pillarBuckets, pillars);
writeJson(HINTS_PATH, {
  updated: nowIso(), date: today(),
  slot: slotPick.choice, slot_exploration: slotPick.exploration,
  pillar: pillarPick.choice, pillar_exploration: pillarPick.exploration,
  note: "advisory hints from the learning loop — producers lean towards these unless the day's strategy says otherwise",
});

// ---- experiment registry ----
const variantGroups = [];
const seenGroups = new Set();
for (const { item } of queueItems()) {
  const g = item.payload?.variant_group;
  if (!g || seenGroups.has(g)) continue;
  seenGroups.add(g);
  variantGroups.push({ group: g, hypothesis: `hook A/B for "${item.title?.replace(/ \(variant [AB]\)$/i, "")}"`, variants: [item.payload?.utm || ""] });
}
const comparisons = readJson("data/state/creative-performance.json", {}).variant_comparisons || [];
const experiments = updateExperiments(readJson(EXPERIMENTS_PATH, { experiments: [] }), {
  variantGroups, comparisons, aggregates, todayStr: today(),
});
writeJson(EXPERIMENTS_PATH, experiments);

// ---- meta-metrics: is the loop working? ----
const meta = metaMetrics(events);
writeJson(META_PATH, meta);

// ---- optional weekly narrative (Claude reads AGGREGATES, not raw text) ----
if (WEEKLY && process.env.ANTHROPIC_API_KEY?.trim()) {
  try {
    const { structured } = await import("./lib/claude.js");
    const { data } = await structured({
      charter: `You are the fleet's learning analyst. You receive NUMERIC aggregates only.
Write a short narrative of what the fleet has learned, what it should test next, and
which lessons look shaky. Never propose anything that weakens compliance rules.`,
      user: `Aggregates (numbers only): ${JSON.stringify(numericAggregates(aggregates))}
Active lessons: ${JSON.stringify(updated.lessons.filter((l) => l.status === "active").slice(0, 12).map((l) => ({ id: l.id, statement: l.statement, evidence: l.evidence, confidence: l.confidence })))}
Meta-metrics: ${JSON.stringify(meta.last7)} (prev: ${JSON.stringify(meta.prev7)})
Open experiments: ${JSON.stringify(experiments.experiments.filter((e) => e.status === "open").slice(0, 5))}
Next hypothesis: ${experiments.next_hypothesis || "none"}`,
      schema: {
        type: "object",
        required: ["narrative", "test_next", "shaky_lessons"],
        properties: {
          narrative: { type: "string" },
          test_next: { type: "array", items: { type: "string" } },
          shaky_lessons: { type: "array", items: { type: "string" }, description: "lesson ids that look under-evidenced" },
        },
      },
    });
    updated.weekly_narrative = { date: today(), ...data };
  } catch (e) {
    console.log(`[learn] weekly narrative skipped: ${String(e.message).slice(0, 120)}`);
  }
}

writeJson(LESSONS_PATH, updated);

const active = updated.lessons.filter((l) => l.status === "active").length;
console.log(
  `[learn] ${events.length} event(s) → ${active} active lesson(s) · ` +
  `${negatives.phrases.length} learned negative(s) · slot hint ${slotPick.choice || "—"}${slotPick.exploration ? " (explore)" : ""} · ` +
  `${experiments.experiments.filter((e) => e.status === "open").length} open experiment(s) · ` +
  `${meta.regressions.length} regression(s)${WEEKLY ? " · weekly narrative" : ""}`
);
