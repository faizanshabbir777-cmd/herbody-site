import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProducerPayload } from "../lib/creative-requests.js";
import { makeId } from "../lib/queue.js";

const SPEC = {
  version: 2,
  brand_name: "HerBody",
  product_type: "Powdered daily supplement (creatine + collagen + multivitamin)",
  product_name: "HerBody No.01 — The Daily",
};
const GATE = { mode: "references", references: [{ id: "hero-1", url: "https://cdn/hero.jpg" }] };

const PACK = {
  slug: "morning-ritual-asmr",
  title: "Morning ritual ASMR",
  platforms: ["tiktok"],
  formats: ["short-video"],
  trend_basis: "asmr pour trend",
  trend_id: "tr-abc123def456",
  relevance_reason: "matches ritual/asmr keywords",
  hook: "Ten seconds. That's the whole routine.",
  shot_list: ["macro scoop pour", "shake by the window"],
  voiceover: "…",
  on_screen_text: ["Scoop. Shake. Done."],
  caption: "The 10-second ritual.",
  hashtags: ["#morningritual"],
  cta: "Start your ritual",
  landing_url: "https://shop/pdp",
  utm: "utm_source=tiktok&utm_content=vid_asmr01",
  generation_prompt: "macro shot of the pouch…",
  product_on_screen_plan: "pouch hero at 0s, scoop pour at 3s",
  compliance_status: "PASS",
};

const CREATIVE = {
  media_status: "generated",
  media_url: "https://cdn/out.mp4",
  visual_qa_status: "needs_review",
  generation_prompt: "macro shot of the pouch… + preservation clause",
  provider_job_id: "job-9",
};

test("video queue payload carries every plan-required field", () => {
  const p = buildProducerPayload(PACK, SPEC, GATE, CREATIVE, { assetType: "video", registerChecked: "2026-07-07" });
  for (const field of [
    "slug", "title", "brand_name", "product_type", "product_spec_version", "product_asset_ids",
    "product_on_screen_plan", "visual_qa_status", "platforms", "formats", "trend_basis", "trend_id",
    "relevance_reason", "hook", "shot_list", "on_screen_text", "caption", "hashtags", "cta",
    "landing_url", "utm", "generation_prompt", "media_status", "compliance_status", "register_checked",
  ]) {
    assert.ok(field in p, `missing field: ${field}`);
  }
  assert.equal(p.brand_name, "HerBody");
  assert.match(p.product_type, /Powdered daily supplement/);
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
  const id = makeId("video", "Morning Ritual ASMR!");
  assert.match(id, /^\d{4}-\d{2}-\d{2}-video-morning-ritual-asmr$/);
});
