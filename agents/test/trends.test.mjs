import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRecord, relevance, scoreRecords, BANNED_THEMES, trendId, sourceAdjustment } from "../lib/trends.js";

const KEYWORDS = ["creatine", "collagen", "supplement", "morning routine", "taste test"];

test("normalizeRecord fills the canonical shape with safe defaults", () => {
  const r = normalizeRecord({ observed_hook: "creatine collagen taste test", platform: "tiktok" });
  assert.equal(r.platform, "tiktok");
  assert.equal(r.format, "video");
  assert.equal(r.relevance_score, 0);
  assert.equal(typeof r.observed_at, "string");
  assert.equal(r.reject_reason, "");
});

test("normalizeRecord truncates oversized fields", () => {
  const r = normalizeRecord({ observed_hook: "x".repeat(1000) });
  assert.equal(r.observed_hook.length, 300);
});

test("relevance scores keyword matches", () => {
  const r = normalizeRecord({ observed_hook: "creatine collagen morning routine unboxing" });
  const { score, reject } = relevance(r, KEYWORDS);
  assert.equal(reject, "");
  assert.ok(score >= 0.9, `expected high score, got ${score}`);
});

test("irrelevant records get a reject_reason", () => {
  const r = normalizeRecord({ observed_hook: "funny cat video compilation" });
  const { score, reject } = relevance(r, KEYWORDS);
  assert.equal(score, 0);
  assert.match(reject, /no overlap/);
});

test("banned themes hard-reject regardless of keyword overlap", () => {
  const cases = [
    ["creatine collagen before and after transformation", /before\/after/],
    ["supplement weight loss hack", /diet-culture/],
    ["doctor recommended creatine cure", /medical/],
    ["verified buyer testimonial creatine collagen", /DMCC/],
    ["only 3 left selling fast creatine", /urgency/],
  ];
  for (const [hook, expect] of cases) {
    const { score, reject } = relevance(normalizeRecord({ observed_hook: hook }), KEYWORDS);
    assert.equal(score, 0, hook);
    assert.match(reject, expect, hook);
  }
});

test("scoreRecords splits relevant vs rejected with audit reasons", () => {
  const records = [
    normalizeRecord({ observed_hook: "creatine collagen supplement taste test" }),
    normalizeRecord({ observed_hook: "before and after gym transformation" }),
    normalizeRecord({ observed_hook: "random gaming clip" }),
  ];
  const { relevant, rejected } = scoreRecords(records, KEYWORDS);
  assert.equal(relevant.length, 1);
  assert.equal(rejected.length, 2);
  assert.ok(rejected.every((r) => r.reject_reason || r.relevance_score < 0.3));
});

test("trendId is stable and content-addressed", () => {
  const a = trendId({ source: "s1", url: "u", observed_hook: "creatine morning routine" });
  const b = trendId({ source: "s1", url: "u", observed_hook: "creatine morning routine" });
  const c = trendId({ source: "s2", url: "u", observed_hook: "creatine morning routine" });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^tr-[0-9a-f]{12}$/);
});

test("normalizeRecord assigns an id and preserves provided ones", () => {
  const r = normalizeRecord({ observed_hook: "x" });
  assert.match(r.id, /^tr-/);
  assert.equal(normalizeRecord({ id: "tr-custom" }).id, "tr-custom");
});

test("trend-source ROI reweights relevance (learning loop)", () => {
  assert.equal(sourceAdjustment("winner-src", { "winner-src": { winners: 3, total: 6 } }), 0.15);
  assert.equal(sourceAdjustment("dud-src", { "dud-src": { winners: 0, total: 6 } }), -0.1);
  assert.equal(sourceAdjustment("new-src", { "dud-src": { winners: 0, total: 6 } }), 0);
  const records = [
    normalizeRecord({ source: "winner-src", observed_hook: "creatine morning routine" }),
    normalizeRecord({ source: "dud-src", observed_hook: "creatine morning routine" }),
  ];
  const { relevant } = scoreRecords(records, KEYWORDS, {
    sourceRoi: { "winner-src": { winners: 2, total: 4 }, "dud-src": { winners: 0, total: 8 } },
  });
  const w = relevant.find((r) => r.source === "winner-src");
  const d = relevant.find((r) => r.source === "dud-src");
  assert.ok(w.relevance_score > d.relevance_score);
  assert.match(w.why_relevant, /source has produced winners/);
});

test("BANNED_THEMES covers all required rejection categories", () => {
  const reasons = BANNED_THEMES.map((b) => b.reason).join(" ");
  for (const cat of ["diet-culture", "body-checking", "before/after", "medical", "DMCC", "urgency", "licensing"]) {
    assert.match(reasons, new RegExp(cat.replace("/", "\\/")), cat);
  }
});
