import { test } from "node:test";
import assert from "node:assert/strict";
import {
  engagementRatePct, labelCreative, labelAll, paidTestCandidates, paidTestDraft,
} from "../lib/performance.js";

const T = {
  min_impressions: 2000,
  min_engagement_rate_pct: 6,
  min_completion_rate_pct: 25,
  promising_engagement_rate_pct: 3.5,
  fatigue_drop_pct: 50,
};

test("engagement rate maths", () => {
  assert.equal(engagementRatePct({ impressions: 1000, likes: 50, comments: 10, shares: 5, saves: 5 }), 7);
  assert.equal(engagementRatePct({ impressions: 0, likes: 10 }), 0);
});

test("winner: high ER + completion at volume", () => {
  const r = labelCreative({ impressions: 5000, likes: 300, comments: 40, shares: 20, completion_rate_pct: 40 }, T);
  assert.equal(r.label, "winner");
  assert.match(r.recommended_action, /paid test/);
});

test("promising: not enough impressions yet", () => {
  const r = labelCreative({ impressions: 500, likes: 100 }, T);
  assert.equal(r.label, "promising");
  assert.match(r.reason, /not enough data/);
});

test("promising: mid engagement at volume", () => {
  const r = labelCreative({ impressions: 5000, likes: 200 }, T); // ER 4%
  assert.equal(r.label, "promising");
});

test("reject: low engagement at volume", () => {
  const r = labelCreative({ impressions: 5000, likes: 50 }, T); // ER 1%
  assert.equal(r.label, "reject");
  assert.match(r.recommended_action, /do not spend/);
});

test("fatigue: engagement collapse vs prior period", () => {
  const r = labelCreative({ impressions: 8000, likes: 600, trend_delta_pct: -60 }, T);
  assert.equal(r.label, "fatigue");
  assert.match(r.recommended_action, /retire/);
});

test("completion gate can hold a high-ER video out of winner", () => {
  const r = labelCreative({ impressions: 5000, likes: 400, completion_rate_pct: 10 }, T);
  assert.notEqual(r.label, "winner");
});

test("paidTestCandidates picks winners only", () => {
  const rows = labelAll([
    { creative_id: "a", impressions: 5000, likes: 400, completion_rate_pct: 40 },
    { creative_id: "b", impressions: 5000, likes: 50 },
    { creative_id: "c", impressions: 100, likes: 10 },
  ], T);
  const winners = paidTestCandidates(rows);
  assert.deepEqual(winners.map((w) => w.creative_id), ["a"]);
});

test("paidTestDraft: PAUSED, routed to website until Shop approved, HB_UK prefix", () => {
  const d = paidTestDraft(
    { creative_id: "2026-07-07-tiktok-hook", platform: "tiktok", media_url: "https://cdn/x.mp4", utm_content: "vid_x01" },
    { budgetGbp: 10, tiktokShopApproved: false, landingUrl: "https://shop/pdp" }
  );
  assert.equal(d.status, "PAUSED");
  assert.equal(d.destination, "website_pdp");
  assert.equal(d.landing_url, "https://shop/pdp");
  assert.match(d.campaign_name, /^HB_UK_TIKTOK_WINNER_/);
});

test("revenue trumps engagement: creative that sells is a winner", () => {
  const r = labelCreative({ impressions: 500, likes: 3, revenue_gbp: 120, orders: 3, utm_content: "vid_x01" }, T);
  assert.equal(r.label, "winner");
  assert.match(r.reason, /£120 attributed revenue/);
  // a single order below the revenue floor does not
  const low = labelCreative({ impressions: 500, likes: 3, revenue_gbp: 20, orders: 1 }, T);
  assert.notEqual(low.reason.includes("revenue"), true);
});

test("paidTestDraft: tiktok routes to Shop once approved; meta platforms map to meta", () => {
  const shop = paidTestDraft({ creative_id: "x", platform: "tiktok" }, { tiktokShopApproved: true });
  assert.equal(shop.destination, "tiktok_shop");
  const ig = paidTestDraft({ creative_id: "y", platform: "instagram" }, { tiktokShopApproved: true });
  assert.equal(ig.platform, "meta");
  assert.equal(ig.destination, "website_pdp");
});
