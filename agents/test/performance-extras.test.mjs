import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAdRow, effectiveThresholds, variantBase, compareVariants } from "../lib/performance.js";

test("normalizeAdRow: meta conversions come from the actions array", () => {
  const { spend, conversions } = normalizeAdRow("meta", {
    spend: "42.50",
    actions: [
      { action_type: "purchase", value: "3" },
      { action_type: "link_click", value: "50" },
      { action_type: "omni_purchase", value: "1" },
    ],
  });
  assert.equal(spend, 42.5);
  assert.equal(conversions, 4);
});

test("normalizeAdRow: tiktok metrics nested under row.metrics", () => {
  const { spend, conversions } = normalizeAdRow("tiktok", {
    dimensions: { campaign_id: "c1" },
    metrics: { spend: "12.30", conversion: "2" },
  });
  assert.equal(spend, 12.3);
  assert.equal(conversions, 2);
});

test("normalizeAdRow: flat rows and garbage degrade to zeros", () => {
  assert.deepEqual(normalizeAdRow("tiktok", {}), { spend: 0, conversions: 0 });
  assert.deepEqual(normalizeAdRow("meta", { spend: "abc" }), { spend: 0, conversions: 0 });
});

// ---- adaptive thresholds ----

const BASE = {
  min_impressions: 2000, min_engagement_rate_pct: 6, promising_engagement_rate_pct: 3.5,
  min_completion_rate_pct: 25, fatigue_drop_pct: 50,
  adaptive: { enabled: true, min_winner_er_pct: 3, max_winner_er_pct: 12 },
};
const row = (er) => ({ impressions: 10000, likes: Math.round(10000 * er / 100) });

test("adaptive gates track the account median with clamps", () => {
  const rows = [row(2), row(3), row(4), row(5), row(6)]; // median ER 4 → winner gate 6
  const t = effectiveThresholds(rows, BASE);
  assert.equal(t.adaptive_applied, true);
  assert.equal(t.min_engagement_rate_pct, 6);
  assert.equal(t.promising_engagement_rate_pct, 3.6);
});

test("adaptive clamped to floor/ceiling", () => {
  const low = effectiveThresholds([row(0.5), row(0.5), row(0.5), row(0.5), row(0.5)], BASE);
  assert.equal(low.min_engagement_rate_pct, 3); // floor
  const high = effectiveThresholds([row(20), row(20), row(20), row(20), row(20)], BASE);
  assert.equal(high.min_engagement_rate_pct, 12); // ceiling
});

test("adaptive skipped without enough signal or when disabled", () => {
  const few = effectiveThresholds([row(4), row(4)], BASE);
  assert.equal(few.adaptive_applied, false);
  assert.equal(few.min_engagement_rate_pct, 6);
  const off = effectiveThresholds([row(4), row(4), row(4), row(4), row(4)], { ...BASE, adaptive: { enabled: false } });
  assert.equal(off.adaptive_applied, false);
});

// ---- A/B variants ----

test("variantBase parses -a/-b suffixes only", () => {
  assert.equal(variantBase("vid_ritual01-a"), "vid_ritual01");
  assert.equal(variantBase("vid_ritual01-B"), "vid_ritual01");
  assert.equal(variantBase("vid_ritual01"), null);
  assert.equal(variantBase(""), null);
});

test("compareVariants ranks variant groups by engagement", () => {
  const rows = [
    { creative_id: "c1", utm_content: "vid_x01-a", impressions: 5000, likes: 400 }, // ER 8
    { creative_id: "c2", utm_content: "vid_x01-b", impressions: 5000, likes: 100 }, // ER 2
    { creative_id: "c3", utm_content: "vid_y01-a", impressions: 5000, likes: 50 },  // lone variant → skipped
    { creative_id: "c4", utm_content: "vid_z01", impressions: 5000, likes: 50 },    // no suffix → skipped
  ];
  const out = compareVariants(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].base, "vid_x01");
  assert.equal(out[0].leader, "vid_x01-a");
  assert.match(out[0].recommendation, /scale "vid_x01-a"/);
});
