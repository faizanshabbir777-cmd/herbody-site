import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveVisualQa, withResolvedVisualQa } from "../lib/visual-qa.js";
import { applyVisionVerdict } from "../lib/vision-qa.js";

const item = (qa) => ({ id: "x1", payload: { visual_qa_status: qa } });
const dec = (status) => new Map([["x1", { id: "x1", status }]]);

test("human decision wins over machine status", () => {
  assert.equal(resolveVisualQa(item("needs_review"), dec("pass")), "pass");
  assert.equal(resolveVisualQa(item("needs_review"), dec("fail")), "fail");
});

test("no decision → machine status; nothing → not_generated", () => {
  assert.equal(resolveVisualQa(item("needs_review"), new Map()), "needs_review");
  assert.equal(resolveVisualQa({ id: "y", payload: {} }, new Map()), "not_generated");
});

test("media fingerprint: a pass recorded for OLD media is ignored after a new render", () => {
  const decided = new Map([["x1", { id: "x1", status: "pass", media_url: "https://cdn/old.mp4" }]]);
  // same media → pass applies
  const same = { id: "x1", payload: { visual_qa_status: "needs_review", media_url: "https://cdn/old.mp4" } };
  assert.equal(resolveVisualQa(same, decided), "pass");
  // media swapped by collect-pending → stale pass ignored, back to needs_review
  const swapped = { id: "x1", payload: { visual_qa_status: "needs_review", media_url: "https://cdn/new.mp4" } };
  assert.equal(resolveVisualQa(swapped, decided), "needs_review");
  // legacy decisions without media_url still apply (backward compatible)
  const legacy = new Map([["x1", { id: "x1", status: "pass" }]]);
  assert.equal(resolveVisualQa(swapped, legacy), "pass");
});

test("withResolvedVisualQa stamps without mutating the original", () => {
  const orig = item("needs_review");
  const stamped = withResolvedVisualQa(orig, dec("pass"));
  assert.equal(stamped.payload.visual_qa_status, "pass");
  assert.equal(orig.payload.visual_qa_status, "needs_review");
});

test("vision verdict: fail auto-downgrades to failed_auto", () => {
  const out = applyVisionVerdict(
    { visual_qa_status: "needs_review", media_url: "https://x/m.mp4" },
    { checked: true, verdict: "fail", reasons: ["different jar shape"] }
  );
  assert.equal(out.visual_qa_status, "failed_auto");
  assert.match(out.product_fidelity_notes, /AUTO-FAILED/);
});

test("vision verdict: looks_consistent/unclear NEVER auto-pass", () => {
  for (const verdict of ["looks_consistent", "unclear"]) {
    const out = applyVisionVerdict(
      { visual_qa_status: "needs_review" },
      { checked: true, verdict, reasons: [] }
    );
    assert.equal(out.visual_qa_status, "needs_review", verdict);
    assert.equal(out.vision_qa.verdict, verdict);
  }
});

test("unchecked vision result leaves creative untouched", () => {
  const out = applyVisionVerdict({ visual_qa_status: "needs_review" }, { checked: false, verdict: "unclear", reasons: [] });
  assert.equal(out.visual_qa_status, "needs_review");
  assert.equal(out.vision_qa, undefined);
});
