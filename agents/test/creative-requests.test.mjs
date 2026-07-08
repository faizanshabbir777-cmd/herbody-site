import { test } from "node:test";
import assert from "node:assert/strict";
import { requestCreative, reusableCreative } from "../lib/creative-requests.js";

const SPEC = {
  version: 2,
  brand_name: "HerBody",
  product_type: "Powdered daily supplement (creatine + collagen + multivitamin)",
  product_name: "HerBody No.01 — The Daily",
  visual_spec: {
    packaging_type: "matte stand-up pouch",
    container_shape: "stand-up pouch",
    closure: "resealable zip seal",
    label_colours: ["cream", "black", "pink"],
    logo_usage: "wordmark as supplied",
    product_form: "fine powder, 14g scoop",
    product_colour: "pale pink powder",
  },
  forbidden_visual_substitutes: ["stock supplement bottles"],
  approved_reference_assets: [],
};

const genOk = async () => ({
  available: true, status: "generated", provider_job_id: "job-1",
  media_url: "https://cdn.example.com/out.mp4", preview_url: null, thumbnail_url: null,
});
const genManual = async () => ({ available: false, status: "manual", media_url: null, notes: "no key" });
const noRehost = async () => ({ hosted_url: null, hosted_file_id: null, hosted_pending: false, hosting_note: "" });
const noVision = async () => ({ checked: false, verdict: "unclear", reasons: [] });
const DEPS = { spec: SPEC, rehost: noRehost, visionCheck: noVision };

test("blocked spec → blocked status + manual checklist, no generator call", async () => {
  let called = false;
  const r = await requestCreative(
    { platform: "tiktok", asset_type: "video", prompt: "x" },
    { ...DEPS, spec: { ...SPEC, brand_name: "" }, genVideo: async () => { called = true; return genOk(); } }
  );
  assert.equal(called, false, "generator must never run when blocked");
  assert.equal(r.status, "blocked_missing_product_spec");
  assert.equal(r.visual_qa_status, "not_generated");
  assert.ok(r.manual_checklist.how_to_unblock.length > 0);
});

test("required_product_presence=false is rejected — every asset must show the product", async () => {
  const r = await requestCreative(
    { asset_type: "image", prompt: "moodboard", required_product_presence: false },
    { ...DEPS, genImage: genOk }
  );
  assert.equal(r.status, "rejected");
  assert.match(r.product_fidelity_notes, /must visibly show the product/);
});

test("learned negatives from vision failures are merged into generation calls", async () => {
  let captured;
  await requestCreative(
    { asset_type: "video", prompt: "x" },
    {
      ...DEPS,
      negatives: { phrases: [{ text: "wrong packaging shape", count: 3 }] },
      genVideo: async (o) => { captured = o; return genOk(); },
    }
  );
  assert.match(captured.negativePrompt, /wrong packaging shape/);
});

test("spec_only generation → needs_review QA + preservation clause in prompt", async () => {
  let captured;
  const r = await requestCreative(
    { platform: "tiktok", asset_type: "video", prompt: "pouch on a kitchen counter, morning light" },
    { ...DEPS, negatives: { phrases: [] }, genVideo: async (o) => { captured = o; return genOk(); } }
  );
  assert.equal(r.media_status, "generated");
  assert.equal(r.visual_qa_status, "needs_review");
  assert.equal(r.media_url, "https://cdn.example.com/out.mp4");
  assert.match(r.product_fidelity_notes, /REQUIRES close visual QA/);
  assert.match(captured.prompt, /HerBody No\.01 — The Daily/);
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
    { ...DEPS, spec, genImage: async (o) => { captured = o; return genOk(); } }
  );
  assert.equal(r.gate_mode, "references");
  assert.deepEqual(r.product_asset_ids, ["hero-1"]);
  assert.equal(captured.referenceAssets[0].url, "https://cdn.example.com/hero.jpg");
  assert.match(r.product_fidelity_notes, /approved product reference assets/);
});

test("manual degradation (no provider) keeps the pack queueable", async () => {
  const r = await requestCreative(
    { asset_type: "video", prompt: "x" },
    { ...DEPS, genVideo: genManual }
  );
  assert.equal(r.status, "manual");
  assert.equal(r.media_status, "manual");
  assert.equal(r.media_url, null);
  assert.equal(r.visual_qa_status, "not_generated");
});

test("asset_type routes to the right generator", async () => {
  let video = 0, image = 0;
  const deps = {
    ...DEPS,
    genVideo: async () => { video++; return genOk(); },
    genImage: async () => { image++; return genOk(); },
  };
  await requestCreative({ asset_type: "video", prompt: "v" }, deps);
  await requestCreative({ asset_type: "image", prompt: "i" }, deps);
  assert.equal(video, 1);
  assert.equal(image, 1);
});

test("queue-ready metadata carries brand identity + spec version", async () => {
  const r = await requestCreative({ asset_type: "video", prompt: "x" }, { ...DEPS, genVideo: genOk });
  assert.equal(r.brand_name, "HerBody");
  assert.match(r.product_type, /Powdered daily supplement/);
  assert.equal(r.product_spec_version, "v2");
});

test("vision fail auto-downgrades the creative", async () => {
  const r = await requestCreative(
    { asset_type: "image", prompt: "x" },
    { ...DEPS, genImage: genOk, visionCheck: async () => ({ checked: true, verdict: "fail", reasons: ["wrong packaging"] }) }
  );
  assert.equal(r.visual_qa_status, "failed_auto");
  assert.match(r.product_fidelity_notes, /AUTO-FAILED/);
});

// ---- A2: idempotent re-runs reuse existing media instead of regenerating ----

test("reusableCreative: generated media is reused", () => {
  const reuse = reusableCreative({
    media_status: "generated", media_url: "https://cdn/x.mp4",
    provider_job_id: "j1", visual_qa_status: "needs_review", generation_prompt: "p",
  });
  assert.ok(reuse);
  assert.equal(reuse.media_status, "generated");
  assert.equal(reuse.media_url, "https://cdn/x.mp4");
  assert.equal(reuse.reused, true);
});

test("reusableCreative: pending jobs are reused (collect-pending finishes them)", () => {
  const reuse = reusableCreative({ media_status: "pending", provider_job_id: "j2" });
  assert.ok(reuse);
  assert.equal(reuse.media_status, "pending");
});

test("reusableCreative: manual/failed/absent payloads are NOT reused", () => {
  assert.equal(reusableCreative({ media_status: "manual" }), null);
  assert.equal(reusableCreative({ media_status: "failed" }), null);
  assert.equal(reusableCreative({ media_status: "generated", media_url: null }), null);
  assert.equal(reusableCreative(null), null);
});
