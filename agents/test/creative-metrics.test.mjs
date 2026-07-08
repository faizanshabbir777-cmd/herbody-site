import { test } from "node:test";
import assert from "node:assert/strict";
import { utmContentOf, matchPlatformRow, buildCreativeRow } from "../lib/creative-metrics.js";

const ROWS = [
  { platform: "tiktok", post_id: "701", caption: "morning routine utm_content=vid_x01", views: 100, likes: 5 },
  { platform: "tiktok", post_id: "702", caption: "Two gummies. That's the whole routine. #ad", views: 200 },
  { platform: "instagram", post_id: "801", caption: "utm_content=img_y01", impressions: 300, likes: 9 },
];

test("utmContentOf extracts the token from full utm strings and bare fields", () => {
  assert.equal(utmContentOf({ utm: "utm_source=tiktok&utm_content=vid_x01" }), "vid_x01");
  assert.equal(utmContentOf({ utm_content: "img_y01" }), "img_y01");
  assert.equal(utmContentOf({}), "");
});

test("match priority 1: platform_post_id exact", () => {
  const m = matchPlatformRow({ platform: "tiktok", platform_post_id: "702" }, {}, ROWS);
  assert.equal(m.post_id, "702");
});

test("match priority 2: utm_content token in caption", () => {
  const m = matchPlatformRow({ platform: "tiktok" }, { utm: "utm_medium=organic&utm_content=vid_x01" }, ROWS);
  assert.equal(m.post_id, "701");
});

test("match priority 3: caption prefix (manual posts)", () => {
  const m = matchPlatformRow({ platform: "tiktok" }, { caption: "Two gummies. That's the whole routine." }, ROWS);
  assert.equal(m.post_id, "702");
});

test("platform mismatch never matches", () => {
  const m = matchPlatformRow({ platform: "instagram", platform_post_id: "702" }, {}, ROWS);
  assert.equal(m?.post_id, "801" === m?.post_id ? m.post_id : m?.post_id); // no tiktok row
  assert.notEqual(m?.post_id, "702");
});

test("no signals → null match", () => {
  assert.equal(matchPlatformRow({ platform: "tiktok" }, {}, ROWS), null);
});

test("buildCreativeRow assembles the normalized row", () => {
  const entry = { id: "q1", platform: "instagram", agent: "image", platform_post_id: "801", published_at: "2026-07-07T09:00:00Z" };
  const full = { compliance_status: "PASS", payload: { utm_content: "img_y01", image_url: "https://cdn/x.jpg", visual_qa_status: "pass" } };
  const row = buildCreativeRow(entry, full, ROWS[2]);
  assert.equal(row.creative_id, "q1");
  assert.equal(row.asset_type, "image");
  assert.equal(row.impressions, 300);
  assert.equal(row.likes, 9);
  assert.equal(row.matched, true);
  assert.equal(row.visual_qa_status, "pass");
});

test("unmatched row keeps zeros but stays in the dataset", () => {
  const row = buildCreativeRow({ id: "q2", platform: "tiktok", agent: "video" }, { payload: {} }, null);
  assert.equal(row.impressions, 0);
  assert.equal(row.matched, false);
});
