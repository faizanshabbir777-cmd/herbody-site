import { test } from "node:test";
import assert from "node:assert/strict";
import { requestCreative } from "../lib/creative-requests.js";

const SPEC = {
  version: 2,
  brand_name: "PureLife Nutra",
  product_type: "Creatine Gummies",
  product_name: "PureLife Nutra Creatine Gummies",
  visual_spec: {
    packaging_type: "matte white jar",
    container_shape: "round jar",
    lid_colour: "black lid",
    label_colours: ["white", "green"],
    logo_usage: "wordmark as supplied",
    gummy_shape: "cube",
    gummy_colour: "amber",
  },
  forbidden_visual_substitutes: ["stock supplement bottles"],
  approved_reference_assets: [],
};

const genOk = async () => ({
  available: true, status: "generated", provider_job_id: "job-1",
  media_url: "https://cdn.example.com/out.mp4", preview_url: null, thumbnail_url: null,
});
const genManual = async () => ({ available: false, status: "manual", media_url: null, notes: "no key" });

test("blocked spec → blocked status + manual checklist, no generator call", async () => {
  let called = false;
  const r = await requestCreative(
    { platform: "tiktok", asset_type: "video", prompt: "x" },
    { spec: { ...SPEC, brand_name: "" }, genVideo: async () => { called = true; return genOk(); } }
  );
  assert.equal(called, false, "generator must never run when blocked");
  assert.equal(r.status, "blocked_missing_product_spec");
  assert.equal(r.visual_qa_status, "not_generated");
  assert.ok(r.manual_checklist.how_to_unblock.length > 0);
});

test("required_product_presence=false is rejected — every asset must show the product", async () => {
  const r = await requestCreative(
    { asset_type: "image", prompt: "moodboard", required_product_presence: false },
    { spec: SPEC, genImage: genOk }
  );
  assert.equal(r.status, "rejected");
  assert.match(r.product_fidelity_notes, /must visibly show the product/);
});

test("spec_only generation → needs_review QA + preservation clause in prompt", async () => {
  let captured;
  const r = await requestCreative(
    { platform: "tiktok", asset_type: "video", prompt: "jar on a kitchen counter, morning light" },
    { spec: SPEC, genVideo: async (o) => { captured = o; return genOk(); } }
  );
  assert.equal(r.media_status, "generated");
  assert.equal(r.visual_qa_status, "needs_review");
  assert.equal(r.media_url, "https://cdn.example.com/out.mp4");
  assert.match(r.product_fidelity_notes, /REQUIRES close visual QA/);
  assert.match(captured.prompt, /PureLife Nutra Creatine Gummies/);
  assert.match(captured.prompt, /Do not substitute any other supplement product/);
  assert.match(captured.negativePrompt, /stock supplement bottles/);
});

test("references mode passes approved assets to the provider and records their ids", async () => {
  const spec = {
    ...SPEC,
    approved_reference_assets: [{ id: "hero-1", url: "https://cdn.example.com/hero.jpg", approved_for_generation: true }],
  };
  let captured;
  const r = await requestCreative(
    { asset_type: "image", prompt: "flat lay" },
    { spec, genImage: async (o) => { captured = o; return genOk(); } }
  );
  assert.equal(r.gate_mode, "references");
  assert.deepEqual(r.product_asset_ids, ["hero-1"]);
  assert.equal(captured.referenceAssets[0].url, "https://cdn.example.com/hero.jpg");
  assert.match(r.product_fidelity_notes, /approved product reference assets/);
});

test("manual degradation (no provider) keeps the pack queueable", async () => {
  const r = await requestCreative(
    { asset_type: "video", prompt: "x" },
    { spec: SPEC, genVideo: genManual }
  );
  assert.equal(r.status, "manual");
  assert.equal(r.media_status, "manual");
  assert.equal(r.media_url, null);
  assert.equal(r.visual_qa_status, "not_generated");
});

test("asset_type routes to the right generator", async () => {
  let video = 0, image = 0;
  const deps = {
    spec: SPEC,
    genVideo: async () => { video++; return genOk(); },
    genImage: async () => { image++; return genOk(); },
  };
  await requestCreative({ asset_type: "video", prompt: "v" }, deps);
  await requestCreative({ asset_type: "image", prompt: "i" }, deps);
  assert.equal(video, 1);
  assert.equal(image, 1);
});

test("queue-ready metadata carries brand identity + spec version", async () => {
  const r = await requestCreative({ asset_type: "video", prompt: "x" }, { spec: SPEC, genVideo: genOk });
  assert.equal(r.brand_name, "PureLife Nutra");
  assert.equal(r.product_type, "Creatine Gummies");
  assert.equal(r.product_spec_version, "v2");
});
