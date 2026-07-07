import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProducerPayload } from "../lib/creative-requests.js";
import { makeId } from "../lib/queue.js";

const SPEC = {
  version: 2,
  brand_name: "PureLife Nutra",
  product_type: "Creatine Gummies",
  product_name: "PureLife Nutra Creatine Gummies",
};
const GATE = { mode: "references", references: [{ id: "hero-1", url: "https://cdn/hero.jpg" }] };

const PACK = {
  slug: "morning-gummies-asmr",
  title: "Morning gummies ASMR",
  platforms: ["tiktok"],
  formats: ["short-video"],
  trend_basis: "asmr unboxing trend",
  relevance_reason: "matches gummies/asmr keywords",
  hook: "Two gummies. That's the whole routine.",
  shot_list: ["macro jar open", "gummies in hand"],
  voiceover: "…",
  on_screen_text: ["Two gummies. Done."],
  caption: "The 10-second routine.",
  hashtags: ["#creatinegummies"],
  cta: "Shop now",
  landing_url: "https://shop/pdp",
  utm: "utm_source=tiktok&utm_content=vid_asmr01",
  generation_prompt: "macro shot of the jar…",
  product_on_screen_plan: "jar hero at 0s, gummies in hand at 3s",
  compliance_status: "PASS",
};

const CREATIVE = {
  media_status: "generated",
  media_url: "https://cdn/out.mp4",
  visual_qa_status: "needs_review",
  generation_prompt: "macro shot of the jar… + preservation clause",
  provider_job_id: "job-9",
};

test("video queue payload carries every plan-required field", () => {
  const p = buildProducerPayload(PACK, SPEC, GATE, CREATIVE, { assetType: "video", registerChecked: "2026-07-07" });
  for (const field of [
    "slug", "title", "brand_name", "product_type", "product_spec_version", "product_asset_ids",
    "product_on_screen_plan", "visual_qa_status", "platforms", "formats", "trend_basis",
    "relevance_reason", "hook", "shot_list", "on_screen_text", "caption", "hashtags", "cta",
    "landing_url", "utm", "generation_prompt", "media_status", "compliance_status", "register_checked",
  ]) {
    assert.ok(field in p, `missing field: ${field}`);
  }
  assert.equal(p.brand_name, "PureLife Nutra");
  assert.equal(p.product_type, "Creatine Gummies");
  assert.equal(p.product_spec_version, "v2");
  assert.deepEqual(p.product_asset_ids, ["hero-1"]);
  assert.equal(p.video_url, "https://cdn/out.mp4");
  assert.equal(p.asset_type, "video");
});

test("image payload maps media to image_url", () => {
  const p = buildProducerPayload(PACK, SPEC, GATE, CREATIVE, { assetType: "image" });
  assert.equal(p.image_url, "https://cdn/out.mp4");
  assert.equal(p.asset_type, "image");
  assert.ok(!("video_url" in p));
});

test("ungenerated creative yields null media url but keeps the pack", () => {
  const p = buildProducerPayload(PACK, SPEC, GATE, { media_status: "manual", visual_qa_status: "not_generated" }, { assetType: "video" });
  assert.equal(p.video_url, null);
  assert.equal(p.media_status, "manual");
  assert.equal(p.hook, PACK.hook);
});

test("queue ids are date-prefixed slugs", () => {
  const id = makeId("video", "Morning Gummies ASMR!");
  assert.match(id, /^\d{4}-\d{2}-\d{2}-video-morning-gummies-asmr$/);
});
