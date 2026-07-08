// Product asset gate — the single validator every creative producer must pass
// before generating ANY media. Guarantees generated assets depict the real
// HerBody product exactly (per the locked visual spec / approved references)
// and never a random or generic supplement product.
import { readJson } from "./state.js";

export const PRODUCT_ASSETS_PATH = "data/config/product-assets.json";

/** Minimum visual-spec fields required before spec-only generation is allowed. */
export const REQUIRED_IDENTITY_FIELDS = ["brand_name", "product_type", "product_name"];
export const REQUIRED_VISUAL_FIELDS = [
  "packaging_type", "container_shape", "closure",
  "label_colours", "logo_usage", "product_form", "product_colour",
];

export function loadProductSpec() {
  return readJson(PRODUCT_ASSETS_PATH, null);
}

/** Validate identity + minimum visual spec. Returns { ok, missing: [...] }. */
export function validateSpec(spec) {
  const missing = [];
  if (!spec || typeof spec !== "object") return { ok: false, missing: ["product-assets config file"] };
  for (const f of REQUIRED_IDENTITY_FIELDS) {
    if (!String(spec[f] || "").trim()) missing.push(f);
  }
  const vs = spec.visual_spec || {};
  for (const f of REQUIRED_VISUAL_FIELDS) {
    const v = vs[f];
    const empty = v == null || (Array.isArray(v) ? v.length === 0 : !String(v).trim());
    if (empty || /TODO_VERIFY/i.test(String(v))) missing.push(`visual_spec.${f}`);
  }
  return { ok: missing.length === 0, missing };
}

/** Reference assets a human explicitly approved for generation use. */
export function approvedReferences(spec) {
  return (spec?.approved_reference_assets || []).filter(
    (a) => a && a.approved_for_generation === true && String(a.url || "").trim()
  );
}

/**
 * The generation gate. Decides how (and whether) media may be generated:
 *  - "references": approved product references exist → pass them to the provider.
 *  - "spec_only":  no references yet, but the locked visual spec is complete →
 *                  generation allowed, output MUST be marked needs_review.
 *  - "blocked":    neither references nor a complete spec → NO generation;
 *                  queue a manual product-spec checklist instead.
 */
export function generationGate(spec) {
  const refs = approvedReferences(spec);
  const { ok, missing } = validateSpec(spec);
  if (refs.length) return { mode: "references", references: refs, missing: [], visual_qa: "needs_review" };
  if (ok) return { mode: "spec_only", references: [], missing: [], visual_qa: "needs_review" };
  return { mode: "blocked", references: [], missing, visual_qa: "not_generated" };
}

/** Version string recorded on every queued creative so QA knows what it was built against. */
export function specVersion(spec) {
  return `v${spec?.version ?? 0}`;
}

/** Mandatory product-preservation language appended to EVERY generation prompt. */
export function productPreservationClause(spec) {
  const vs = spec?.visual_spec || {};
  const bits = [
    `Depict ${spec?.product_name || "the product"} by ${spec?.brand_name || "the brand"} exactly according to the supplied product visual spec`,
    `packaging: ${vs.packaging_type || "as specified"}`,
    `container: ${vs.container_shape || "as specified"} with ${vs.closure || "the specified closure"}`,
    `label: ${Array.isArray(vs.label_colours) ? vs.label_colours.join(", ") : vs.label_colours || "as specified"}`,
    `product: ${vs.product_form || "as specified"}, ${vs.product_colour || "as specified"}`,
  ];
  return `${bits.join("; ")}. Do not substitute any other supplement product, bottle, jar, pills, capsules, gummies, label, logo, flavour or competitor packaging. Do not redesign or invent label text — the real label artwork is composited before publishing.`;
}

/** Product-level negative prompt merged into every generation call. */
export function productNegativePrompt(spec) {
  const base = [
    "generic supplement bottle", "random pill bottle", "capsules", "pills", "gummies",
    "invented label text", "invented ingredient panel", "redesigned logo", "competitor packaging", "third-party logos",
    "before and after", "body transformation", "medical imagery", "fake review stars",
    "trust badges", "children", "pregnancy imagery", "watermark", "distorted text",
  ];
  const extra = (spec?.forbidden_visual_substitutes || []).map(String);
  return [...new Set([...extra, ...base])].join(", ");
}

/** Human checklist queued when the gate is blocked — instead of generating random visuals. */
export function blockedChecklist(spec, missing) {
  return {
    what_happened: "Creative generation is BLOCKED — no approved product references and the visual spec is incomplete. No media was generated (we never invent random product visuals).",
    missing_details: missing,
    how_to_unblock: [
      `Fill the missing fields in ${PRODUCT_ASSETS_PATH} (visual_spec must describe the real ${spec?.product_name || "product"} packaging).`,
      `OR add real product image URLs to approved_reference_assets with approved_for_generation:true once product photos are on the website.`,
      "Re-run the fleet — producers unblock automatically once either path is complete.",
    ],
  };
}
