import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigest } from "../lib/performance.js";

const ROWS = [
  { platform: "tiktok", asset_type: "video", label: "winner", hook: "H1", trend_id: "tr-1", utm_content: "vid_a01", reason: "ER 8%", revenue_gbp: 50 },
  { platform: "tiktok", asset_type: "video", label: "reject", hook: "H2", trend_id: "tr-2", utm_content: "vid_b01", reason: "ER 1%" },
  { platform: "instagram", asset_type: "image", label: "winner", hook: "H3", utm_content: "img_c01", reason: "ER 7%" },
  { platform: "tiktok", asset_type: "video", label: "fatigue", hook: "H4", trend_id: "tr-1", utm_content: "vid_d01", reason: "dropped 60%" },
];
const VARIANTS = [{ base: "vid_a01", leader: "vid_a01-a", recommendation: "scale a" }];
const TREND_INDEX = { "tr-1": { source: "manual:founder" }, "tr-2": { source: "creative-center" } };

test("digest groups winners/retire per agent", () => {
  const d = buildDigest(ROWS, VARIANTS, TREND_INDEX);
  assert.ok(d.by_agent.video.make_more.some((e) => e.hook === "H1"));
  assert.ok(d.by_agent.tiktok.make_more.some((e) => e.hook === "H1"));
  assert.ok(d.by_agent.video.retire.some((e) => e.hook === "H2"));
  assert.ok(d.by_agent.video.retire.some((e) => e.hook === "H4"));
  assert.ok(d.by_agent.social.make_more.some((e) => e.hook === "H3"));
  assert.ok(d.by_agent.image.make_more.some((e) => e.hook === "H3"));
});

test("digest carries A/B leaders and revenue markers", () => {
  const d = buildDigest(ROWS, VARIANTS, TREND_INDEX);
  assert.equal(d.by_agent.video.ab_leaders[0].leader, "vid_a01-a");
  assert.equal(d.by_agent.video.make_more[0].revenue_gbp, 50);
});

test("trend-source ROI counts winners per source", () => {
  const d = buildDigest(ROWS, [], TREND_INDEX);
  assert.deepEqual(d.trend_source_roi["manual:founder"], { winners: 1, total: 2 });
  assert.deepEqual(d.trend_source_roi["creative-center"], { winners: 0, total: 1 });
});

test("empty inputs yield an empty digest", () => {
  const d = buildDigest([], [], {});
  assert.deepEqual(d.by_agent, {});
  assert.deepEqual(d.trend_source_roi, {});
});
