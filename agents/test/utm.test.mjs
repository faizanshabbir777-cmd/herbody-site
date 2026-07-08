import { test } from "node:test";
import assert from "node:assert/strict";
import { utmCampaign, buildUtm, campaignPrefix, withVariantSuffix } from "../lib/utm.js";

test("utmCampaign follows the lowercase hb_uk convention", () => {
  assert.equal(utmCampaign({ prefix: "hb_uk", channel: "tiktok", name: "Ritual Loop", version: 2 }), "hb_uk_tiktok_ritual_loop_v2");
});

test("buildUtm emits the full lowercase query string", () => {
  const s = buildUtm({ source: "TikTok", medium: "Organic", name: "ritual", content: "VID_X01" });
  assert.match(s, /utm_source=tiktok/);
  assert.match(s, /utm_medium=organic/);
  assert.match(s, /utm_campaign=hb_uk_tiktok_ritual_v1/);
  assert.match(s, /utm_content=vid_x01/);
});

test("campaignPrefix mirrors the spec's utm prefix in caps", () => {
  assert.equal(campaignPrefix({ utm_prefix: "hb_uk" }), "HB_UK");
  assert.equal(campaignPrefix({}), "HB_UK");
});

test("withVariantSuffix suffixes utm_content in full strings and bare tokens", () => {
  assert.equal(
    withVariantSuffix("utm_source=tiktok&utm_content=vid_x01&utm_medium=organic", "a"),
    "utm_source=tiktok&utm_content=vid_x01-a&utm_medium=organic"
  );
  assert.equal(withVariantSuffix("vid_x01", "b"), "vid_x01-b");
  assert.equal(withVariantSuffix("", "a"), "");
});
