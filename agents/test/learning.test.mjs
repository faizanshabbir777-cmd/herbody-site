import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slotOf, deriveEventsFrom, aggregateEvents, aggregateByDimension,
  candidateLessons, updateLessons, lessonsForAgent,
  updateLearnedNegatives, chooseByPerformance, updateExperiments,
  windowRates, metaMetrics, SLOTS,
} from "../lib/learning.js";

// ---------- event derivation ----------

const ITEM = (id, payload = {}, agent = "video", platform = "tiktok") => ({
  id, agent, platform, payload: {
    pillar: "morning ritual", hook_type: "question", angle: "kettle habit",
    post_time_uk: "07:30", ...payload,
  },
});

test("slotOf buckets times into the brand's slots", () => {
  assert.equal(slotOf("07:30"), SLOTS[0]);
  assert.equal(slotOf("12:15"), SLOTS[1]);
  assert.equal(slotOf("19:45"), SLOTS[2]);
  assert.equal(slotOf("03:00"), null);
  assert.equal(slotOf(""), null);
});

test("deriveEventsFrom turns every output into a tagged event with a stable id", () => {
  const events = deriveEventsFrom({
    items: [
      ITEM("q1", {
        compliance_gate: { verdict: "REJECT", reasons: ["banned"], checked_at: "2026-07-08T05:00:00Z" },
        editorial: { verdict: "needs_work", notes: "weak hook", at: "2026-07-08T06:00:00Z" },
        vision_qa: { verdict: "fail", reasons: ["wrong packaging"] },
        media_status: "failed", generation_error: "provider 500",
      }),
    ],
    approvals: [{ id: "q1", status: "rejected", reasons: ["weak-hook"], at: "2026-07-08T09:00:00Z" }],
    visualQa: [{ id: "q1", status: "fail", at: "2026-07-08T09:05:00Z" }],
    published: [{ id: "q1", agent: "video", platform: "tiktok", mode: "api", published_at: "2026-07-08T10:00:00Z" }],
    perfLabels: [{ creative_id: "q1", platform: "tiktok", label: "reject", impressions: 3000, utm_content: "vid_x01" }],
    todayStr: "2026-07-08",
  });
  const types = events.map((e) => e.type);
  for (const t of ["draft_created", "gate_verdict", "editorial_verdict", "vision_fail", "render_failed", "human_decision", "visual_qa", "publish_outcome", "performance"]) {
    assert.ok(types.includes(t), `missing event type ${t}`);
  }
  // every event carries the draft's learning tags
  const human = events.find((e) => e.type === "human_decision");
  assert.equal(human.tags.hook_type, "question");
  assert.equal(human.tags.slot, SLOTS[0]);
  assert.equal(human.signal, -1);
  assert.deepEqual(human.evidence.reasons, ["weak-hook"]);
  // stable ids
  const again = deriveEventsFrom({ items: [ITEM("q1", { compliance_gate: { verdict: "REJECT", reasons: [], checked_at: "2026-07-08T05:00:00Z" } })] });
  assert.equal(again.find((e) => e.type === "gate_verdict").id, "gate:q1:2026-07-08T05:00:00Z");
});

// ---------- aggregation ----------

const outcome = (hook, signal, type = "human_decision") => ({
  type, signal, tags: { hook_type: hook, pillar: "p", slot: SLOTS[0] }, evidence: {},
});

test("aggregateByDimension counts outcome signals only", () => {
  const agg = aggregateByDimension([
    outcome("question", 1), outcome("question", 1), outcome("question", -1),
    outcome("demo", -1), { type: "draft_created", signal: 0, tags: { hook_type: "demo" } },
  ], "hook_type");
  assert.deepEqual(agg.question, { pos: 2, neg: 1, n: 3 });
  assert.deepEqual(agg.demo, { pos: 0, neg: 1, n: 1 });
});

test("aggregateEvents collects rejection and vision-fail reason counts", () => {
  const agg = aggregateEvents([
    { type: "human_decision", signal: -1, tags: {}, evidence: { reasons: ["weak-hook"], note: "" } },
    { type: "human_decision", signal: -1, tags: {}, evidence: { reasons: ["weak-hook", "off-brand"] } },
    { type: "vision_fail", signal: -1, tags: {}, evidence: { reasons: ["wrong packaging"] } },
  ]);
  assert.equal(agg.rejection_reasons["weak-hook"], 2);
  assert.equal(agg.rejection_reasons["off-brand"], 1);
  assert.equal(agg.vision_fail_reasons["wrong packaging"], 1);
});

// ---------- lessons lifecycle ----------

function aggWith(question = { pos: 4, neg: 0, n: 4 }, demo = { pos: 0, neg: 4, n: 4 }) {
  return { by_hook_type: { question, demo }, by_pillar: {}, by_slot: {} };
}

test("candidateLessons finds over/under-performers with enough sample", () => {
  const cands = candidateLessons(aggWith());
  const up = cands.find((c) => c.id === "hook_type:question:up");
  const down = cands.find((c) => c.id === "hook_type:demo:down");
  assert.ok(up && down);
  assert.match(up.statement, /outperforms/);
  assert.match(down.statement, /retire/);
  // thin data → no lessons
  assert.equal(candidateLessons(aggWith({ pos: 1, neg: 0, n: 1 }, { pos: 0, neg: 1, n: 1 })).length, 0);
});

test("lesson lifecycle: create → confirm (+confidence) → decay → contradict → retire", () => {
  let store = updateLessons({ lessons: [] }, candidateLessons(aggWith()), "2026-07-01");
  const l = store.lessons.find((x) => x.id === "hook_type:question:up");
  assert.equal(l.status, "active");
  const c0 = l.confidence;
  // confirmation bumps confidence
  store = updateLessons(store, candidateLessons(aggWith()), "2026-07-02");
  assert.ok(store.lessons.find((x) => x.id === "hook_type:question:up").confidence > c0);
  // decay after 21 unconfirmed days
  store = updateLessons(store, [], "2026-08-01");
  assert.equal(store.lessons.find((x) => x.id === "hook_type:question:up").status, "decayed");
  // reversal contradicts, twice retires
  const reversed = aggWith({ pos: 0, neg: 4, n: 4 }, { pos: 4, neg: 0, n: 4 }); // question now DOWN
  store = updateLessons(store, candidateLessons(reversed), "2026-08-02");
  store = updateLessons(store, candidateLessons(reversed), "2026-08-03");
  assert.equal(store.lessons.find((x) => x.id === "hook_type:question:up").status, "retired");
  assert.equal(store.lessons.find((x) => x.id === "hook_type:question:down").status, "active");
});

test("lessonsForAgent scopes dimensions (image agent has no hook lessons)", () => {
  const store = updateLessons({ lessons: [] }, candidateLessons(aggWith()), "2026-07-01");
  assert.ok(lessonsForAgent(store, "video").length >= 1);
  assert.equal(lessonsForAgent(store, "image").length, 0);
});

// ---------- actions ----------

test("learned negatives are bounded and count-ranked", () => {
  const store = updateLearnedNegatives({ phrases: [] }, { "wrong packaging": 3, "invented label": 1 }, "2026-07-08", 2);
  assert.equal(store.phrases[0].text, "wrong packaging");
  const grown = updateLearnedNegatives(store, Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`r${i}`, i])), "2026-07-09", 20);
  assert.ok(grown.phrases.length <= 20);
});

test("chooseByPerformance exploits the best bucket and explores on epsilon", () => {
  const buckets = { [SLOTS[0]]: { pos: 8, neg: 2 }, [SLOTS[1]]: { pos: 1, neg: 9 }, [SLOTS[2]]: { pos: 0, neg: 0 } };
  const exploit = chooseByPerformance(buckets, SLOTS, { epsilon: 0, rand: () => 0.99 });
  assert.equal(exploit.choice, SLOTS[0]);
  assert.equal(exploit.exploration, false);
  const explore = chooseByPerformance(buckets, SLOTS, { epsilon: 1, rand: () => 0.5 });
  assert.equal(explore.exploration, true);
  assert.ok(SLOTS.includes(explore.choice));
  assert.equal(chooseByPerformance({}, [], { epsilon: 0 }).choice, null);
});

test("experiments register, resolve from comparisons, and propose the least-sampled hook", () => {
  let reg = updateExperiments({ experiments: [] }, {
    variantGroups: [{ group: "2026-07-08-video-x", hypothesis: "hook A/B for x", variants: ["utm_content=vid_x01-a"] }],
    comparisons: [],
    aggregates: { by_hook_type: { question: { n: 5 }, statement: { n: 3 }, statistic: { n: 2 }, "pattern-interrupt": { n: 1 }, demo: { n: 0 } } },
    todayStr: "2026-07-08",
  });
  assert.equal(reg.experiments[0].status, "open");
  assert.match(reg.next_hypothesis, /"demo"/);
  reg = updateExperiments(reg, {
    variantGroups: [],
    comparisons: [{ base: "vid_x01", leader: "vid_x01-a", recommendation: "scale a" }],
    aggregates: {},
    todayStr: "2026-07-09",
  });
  assert.equal(reg.experiments[0].status, "resolved");
  assert.equal(reg.experiments[0].leader, "vid_x01-a");
});

// ---------- meta-metrics ----------

const ev = (type, signal, daysAgo, now = "2026-07-08T12:00:00Z") => ({
  type, signal, tags: {}, evidence: {},
  at: new Date(new Date(now).getTime() - daysAgo * 864e5).toISOString(),
});

test("windowRates computes failure/success rates", () => {
  const r = windowRates([
    ev("human_decision", 1, 0), ev("human_decision", -1, 0),
    ev("gate_verdict", -1, 0), ev("gate_verdict", 0, 0),
    ev("performance", 1, 0), ev("performance", -1, 0),
  ]);
  assert.equal(r.human_rejection_rate, 0.5);
  assert.equal(r.gate_reject_rate, 0.5);
  assert.equal(r.winner_rate, 0.5);
});

test("metaMetrics flags regressions when bad rates rise >10pts week over week", () => {
  const events = [
    // prev 7d: no rejections
    ev("human_decision", 1, 10), ev("human_decision", 1, 9), ev("human_decision", 1, 8),
    // last 7d: mostly rejections
    ev("human_decision", -1, 2), ev("human_decision", -1, 1), ev("human_decision", 1, 1),
  ];
  const m = metaMetrics(events, "2026-07-08T12:00:00Z");
  assert.ok(m.regressions.some((r) => r.metric === "human_rejection_rate"));
  // improving direction → no regression
  const improving = metaMetrics([...events].map((e) => ({ ...e, signal: -e.signal })), "2026-07-08T12:00:00Z");
  assert.ok(!improving.regressions.some((r) => r.metric === "human_rejection_rate"));
});
