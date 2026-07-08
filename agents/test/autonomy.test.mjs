import { test } from "node:test";
import assert from "node:assert/strict";
import {
  modeAllows, canAutoPost, canAutoScale, stopLossTriggered,
  postedTodayByPlatform, DEFAULT_POLICY, loadAutonomy,
} from "../lib/autonomy.js";

const POLICY = {
  ...DEFAULT_POLICY,
  mode: "auto_post_organic",
  allowed_platforms: ["tiktok", "instagram"],
  max_posts_per_day_by_platform: { tiktok: 2, instagram: 1 },
  allow_self_only_tiktok_posts: true, // most tests assume TikTok posting is enabled
};

const TODAY = "2026-07-07";
const CLOCK = { todayStr: TODAY };
const ITEM = {
  platform: "tiktok",
  scheduled_for: TODAY,
  compliance_status: "PASS",
  payload: {
    visual_qa_status: "pass",
    video_url: "https://cdn.example.com/x.mp4",
    compliance_gate: { verdict: "PASS", reasons: [] },
  },
};

test("mode ladder — each mode includes everything below it", () => {
  assert.equal(modeAllows({ mode: "draft_only" }, "generate"), false);
  assert.equal(modeAllows({ mode: "auto_generate" }, "generate"), true);
  assert.equal(modeAllows({ mode: "auto_generate" }, "post_organic"), false);
  assert.equal(modeAllows({ mode: "auto_post_organic" }, "post_organic"), true);
  assert.equal(modeAllows({ mode: "auto_post_organic" }, "scale_ads"), false);
  assert.equal(modeAllows({ mode: "auto_scale_ads" }, "scale_ads"), true);
});

test("kill switch halts everything regardless of mode", () => {
  const p = { ...POLICY, mode: "auto_scale_ads", kill_switch: true };
  assert.equal(modeAllows(p, "generate"), false);
  assert.equal(canAutoPost(p, ITEM, {}, CLOCK).ok, false);
  assert.equal(canAutoScale(p, { proposedDailyBudgetGbp: 5 }).ok, false);
});

test("auto post allowed only when every gate passes", () => {
  assert.equal(canAutoPost(POLICY, ITEM, {}, CLOCK).ok, true);
});

test("auto post blocked in draft_only / auto_generate", () => {
  const r = canAutoPost({ ...POLICY, mode: "auto_generate" }, ITEM, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /does not allow auto posting/);
});

test("platform allowlist enforced", () => {
  const r = canAutoPost(POLICY, { ...ITEM, platform: "facebook" }, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /not in allowed_platforms/);
});

test("stale drafts (scheduled_for != today) never auto-post", () => {
  const r = canAutoPost(POLICY, { ...ITEM, scheduled_for: "2026-07-01" }, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /stale drafts never auto-post/);
  const missing = canAutoPost(POLICY, { ...ITEM, scheduled_for: undefined }, {}, CLOCK);
  assert.equal(missing.ok, false);
});

test("per-platform daily caps enforced", () => {
  assert.equal(canAutoPost(POLICY, ITEM, { tiktok: 1 }, CLOCK).ok, true);
  const r = canAutoPost(POLICY, ITEM, { tiktok: 2 }, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /daily cap reached/);
});

test("missing cap config blocks (fail closed)", () => {
  const p = { ...POLICY, max_posts_per_day_by_platform: {} };
  assert.equal(canAutoPost(p, ITEM, {}, CLOCK).ok, false);
});

test("compliance gate: NEEDS_REVIEW never auto-posts", () => {
  const r = canAutoPost(POLICY, { ...ITEM, compliance_status: "NEEDS_REVIEW" }, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /compliance/);
});

test("mechanical compliance-gate stamp required — self-assessed PASS alone never auto-posts", () => {
  const noStamp = { ...ITEM, payload: { ...ITEM.payload, compliance_gate: undefined } };
  const r = canAutoPost(POLICY, noStamp, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /compliance gate verdict/);
  const rejected = { ...ITEM, payload: { ...ITEM.payload, compliance_gate: { verdict: "REJECT" } } };
  assert.equal(canAutoPost(POLICY, rejected, {}, CLOCK).ok, false);
});

test("SELF_ONLY flag: TikTok auto-posting blocked until the app audit flag is set", () => {
  const p = { ...POLICY, allow_self_only_tiktok_posts: false };
  const r = canAutoPost(p, ITEM, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /SELF_ONLY/);
  // Instagram unaffected by the TikTok flag
  const ig = canAutoPost(p, {
    ...ITEM, platform: "instagram",
    payload: { ...ITEM.payload, video_url: null, image_url: "https://cdn/x.jpg" },
  }, {}, CLOCK);
  assert.equal(ig.ok, true);
});

test("visual QA gate: generated media without a human pass never auto-posts", () => {
  for (const qa of ["needs_review", "not_generated", undefined]) {
    const r = canAutoPost(POLICY, { ...ITEM, payload: { ...ITEM.payload, visual_qa_status: qa } }, {}, CLOCK);
    assert.equal(r.ok, false, `qa=${qa}`);
    assert.match(r.reason, /visual_qa_status/);
  }
});

test("media gate: tiktok/instagram items without a hosted media URL never auto-post", () => {
  const r = canAutoPost(POLICY, { ...ITEM, payload: { ...ITEM.payload, video_url: null } }, {}, CLOCK);
  assert.equal(r.ok, false);
  assert.match(r.reason, /no hosted media URL/);
  const ig = canAutoPost(POLICY, {
    ...ITEM, platform: "instagram",
    payload: { ...ITEM.payload, video_url: null, image_url: "https://cdn/x.jpg" },
  }, {}, CLOCK);
  assert.equal(ig.ok, true);
});

test("auto scale: budget clamped to fleet cap", () => {
  const p = { ...POLICY, mode: "auto_scale_ads" };
  const r = canAutoScale(p, { proposedDailyBudgetGbp: 100 });
  assert.equal(r.budget, p.ads.max_daily_ad_budget_gbp);
});

test("auto scale: fleet cap across campaigns enforced", () => {
  const p = { ...POLICY, mode: "auto_scale_ads" };
  const r = canAutoScale(p, { proposedDailyBudgetGbp: 10, fleetDailySpendGbp: 20 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /cap/);
});

test("auto scale: increase percentage capped", () => {
  const p = { ...POLICY, mode: "auto_scale_ads" };
  const r = canAutoScale(p, { currentDailyBudgetGbp: 10, proposedDailyBudgetGbp: 20 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /max_budget_increase_pct/);
  const ok = canAutoScale(p, { currentDailyBudgetGbp: 10, proposedDailyBudgetGbp: 12 });
  assert.equal(ok.ok, true);
});

test("auto scale refused below auto_scale_ads mode — drafts stay PAUSED", () => {
  const r = canAutoScale(POLICY, { proposedDailyBudgetGbp: 5 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /PAUSED/);
});

test("stop-loss triggers on spend without conversions, low ROAS, high CPA", () => {
  assert.equal(stopLossTriggered(POLICY, { spendGbp: 45, conversions: 0 }).triggered, true);
  assert.equal(stopLossTriggered(POLICY, { spendGbp: 45, conversions: 3 }).triggered, false);
  assert.equal(stopLossTriggered(POLICY, { spendGbp: 25, conversions: 2, roas: 0.8 }).triggered, true);
  assert.equal(stopLossTriggered(POLICY, { spendGbp: 10, conversions: 1, cpaGbp: 60 }).triggered, true);
});

test("postedTodayByPlatform counts only today's API posts", () => {
  const today = "2026-07-07";
  const counts = postedTodayByPlatform([
    { platform: "tiktok", published_at: "2026-07-07T08:00:00Z", mode: "api" },
    { platform: "tiktok", published_at: "2026-07-07T09:00:00Z", mode: "ready-manual" },
    { platform: "tiktok", published_at: "2026-07-06T09:00:00Z", mode: "api" },
    { platform: "instagram", published_at: "2026-07-07T10:00:00Z", mode: "api" },
  ], today);
  assert.deepEqual(counts, { tiktok: 1, instagram: 1 });
});

test("shipped repo policy loads with safe gates on", () => {
  const p = loadAutonomy();
  assert.equal(p.requires_visual_qa_pass, true);
  assert.equal(p.requires_compliance_pass, true);
  assert.equal(p.kill_switch, false);
  assert.ok(["draft_only", "auto_generate", "auto_post_organic", "auto_scale_ads"].includes(p.mode));
});
