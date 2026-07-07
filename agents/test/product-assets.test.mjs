import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSpec, approvedReferences, generationGate,
  productPreservationClause, productNegativePrompt, specVersion, loadProductSpec,
} from "../lib/product-assets.js";

const COMPLETE_SPEC = {
  version: 3,
  brand_name: "PureLife Nutra",
  product_type: "Creatine Gummies",
  product_name: "PureLife Nutra Creatine Gummies",
  visual_spec: {
    packaging_type: "matte white jar",
    container_shape: "round wide-mouth jar",
    lid_colour: "matte black lid",
    label_colours: ["white", "green"],
    logo_usage: "wordmark exactly as supplied",
    gummy_shape: "cube",
    gummy_colour: "amber",
  },
  forbidden_visual_substitutes: ["stock supplement bottles"],
  approved_reference_assets: [],
};

test("validateSpec passes a complete spec", () => {
  const { ok, missing } = validateSpec(COMPLETE_SPEC);
  assert.equal(ok, true);
  assert.deepEqual(missing, []);
});

test("validateSpec reports every missing/TODO field", () => {
  const broken = {
    ...COMPLETE_SPEC,
    brand_name: "",
    visual_spec: { ...COMPLETE_SPEC.visual_spec, gummy_colour: "TODO_VERIFY", lid_colour: "" },
  };
  const { ok, missing } = validateSpec(broken);
  assert.equal(ok, false);
  assert.ok(missing.includes("brand_name"));
  assert.ok(missing.includes("visual_spec.gummy_colour"));
  assert.ok(missing.includes("visual_spec.lid_colour"));
});

test("validateSpec blocks on missing config entirely", () => {
  assert.equal(validateSpec(null).ok, false);
});

test("gate: blocked when no references AND incomplete spec — never generates random products", () => {
  const gate = generationGate({ ...COMPLETE_SPEC, brand_name: "" });
  assert.equal(gate.mode, "blocked");
  assert.equal(gate.visual_qa, "not_generated");
  assert.ok(gate.missing.length > 0);
});

test("gate: spec_only when spec is complete but no references — generation allowed with QA", () => {
  const gate = generationGate(COMPLETE_SPEC);
  assert.equal(gate.mode, "spec_only");
  assert.equal(gate.visual_qa, "needs_review");
});

test("gate: references mode when an approved reference exists", () => {
  const spec = {
    ...COMPLETE_SPEC,
    approved_reference_assets: [
      { id: "hero-1", url: "https://cdn.example.com/hero.jpg", approved_for_generation: true },
      { id: "unapproved", url: "https://cdn.example.com/x.jpg", approved_for_generation: false },
    ],
  };
  const gate = generationGate(spec);
  assert.equal(gate.mode, "references");
  assert.equal(gate.references.length, 1);
  assert.equal(gate.references[0].id, "hero-1");
});

test("only approved_for_generation:true references are used", () => {
  const refs = approvedReferences({
    approved_reference_assets: [
      { id: "a", url: "https://x/a.jpg", approved_for_generation: true },
      { id: "b", url: "https://x/b.jpg" },
      { id: "c", url: "", approved_for_generation: true },
    ],
  });
  assert.deepEqual(refs.map((r) => r.id), ["a"]);
});

test("preservation clause names the exact product and forbids substitution", () => {
  const clause = productPreservationClause(COMPLETE_SPEC);
  assert.match(clause, /PureLife Nutra Creatine Gummies/);
  assert.match(clause, /Do not substitute any other supplement product/);
});

test("negative prompt merges spec substitutes with global bans", () => {
  const neg = productNegativePrompt(COMPLETE_SPEC);
  assert.match(neg, /stock supplement bottles/);
  assert.match(neg, /before and after/);
  assert.match(neg, /competitor packaging/);
});

test("specVersion is stable", () => {
  assert.equal(specVersion(COMPLETE_SPEC), "v3");
  assert.equal(specVersion(null), "v0");
});

test("shipped repo config validates and gates as spec_only (generation ready before website images exist)", () => {
  const spec = loadProductSpec();
  assert.ok(spec, "data/config/product-assets.json must exist");
  assert.equal(spec.brand_name, "PureLife Nutra");
  assert.equal(spec.product_type, "Creatine Gummies");
  const gate = generationGate(spec);
  assert.equal(gate.mode, "spec_only");
});
