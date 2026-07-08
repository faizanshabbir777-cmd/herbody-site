// Shared creative-request contract — the ONE path any agent (tiktok, social,
// video, image, paid) uses to obtain generated media. It enforces the product
// gate (PureLife Nutra Creatine Gummies only — never random products), appends
// the product-preservation clause + negative prompt, and returns queue-ready
// metadata. Media URLs only — files never land in the repo.
import {
  loadProductSpec, generationGate, specVersion,
  productPreservationClause, productNegativePrompt, blockedChecklist,
} from "./product-assets.js";
import { generateVideo, generateImage } from "./creative-gen.js";
import { rehostMedia, hostOf } from "./media.js";
import { visionQaCheck, applyVisionVerdict } from "./vision-qa.js";

/**
 * Assemble the queue payload for a producer draft: creative pack fields + product
 * identity + gate provenance + generation result. Pure — unit-testable without
 * Claude or providers. Used by agents/video.js and agents/image.js.
 */
export function buildProducerPayload(pack, spec, gate, creative, { assetType = "video", registerChecked } = {}) {
  const mediaKey = assetType === "image" ? "image_url" : "video_url";
  return {
    ...pack,
    asset_type: assetType,
    brand_name: spec?.brand_name || null,
    product_type: spec?.product_type || null,
    product_spec_version: specVersion(spec),
    product_asset_ids: (gate?.references || []).map((r) => r.id || r.url),
    ...creative,
    [mediaKey]: creative?.media_url || null,
    register_checked: registerChecked || new Date().toISOString().slice(0, 10),
  };
}

/**
 * Request one creative asset.
 * @param {object} req {
 *   platform, format, creative_goal, trend_basis, copy,
 *   asset_type: "video"|"image", prompt, negative_prompt,
 *   aspect_ratio, duration_s, required_product_presence (default true)
 * }
 * @param {object} [deps] injectable for tests { spec, genVideo, genImage }
 * @returns queue-ready creative metadata (never throws for policy reasons).
 */
export async function requestCreative(req, deps = {}) {
  const spec = deps.spec !== undefined ? deps.spec : loadProductSpec();
  const gate = generationGate(spec);
  const base = {
    asset_type: req.asset_type === "image" ? "image" : "video",
    platform: req.platform || "tiktok",
    format: req.format || (req.asset_type === "image" ? "feed" : "short-video"),
    creative_goal: req.creative_goal || "",
    trend_basis: req.trend_basis || "",
    brand_name: spec?.brand_name || null,
    product_type: spec?.product_type || null,
    product_spec_version: specVersion(spec),
    product_asset_ids: gate.references.map((r) => r.id || r.url),
    gate_mode: gate.mode,
  };

  if (req.required_product_presence === false) {
    // Not allowed by policy — every asset must show the product.
    return {
      ...base, status: "rejected", media_status: "rejected",
      visual_qa_status: "not_generated",
      product_fidelity_notes: "rejected: required_product_presence=false is not permitted — every asset must visibly show the product",
    };
  }

  if (gate.mode === "blocked") {
    return {
      ...base, status: "blocked_missing_product_spec", media_status: "blocked_missing_product_spec",
      visual_qa_status: "not_generated",
      product_fidelity_notes: `blocked: incomplete product spec (${gate.missing.join(", ")})`,
      manual_checklist: blockedChecklist(spec, gate.missing),
    };
  }

  const prompt = [String(req.prompt || req.copy || "").trim(), productPreservationClause(spec)]
    .filter(Boolean).join("\n\n");
  const negative = [String(req.negative_prompt || "").trim(), productNegativePrompt(spec)]
    .filter(Boolean).join(", ");

  const gen = base.asset_type === "image"
    ? await (deps.genImage || generateImage)({
        prompt, negativePrompt: negative,
        aspectRatio: req.aspect_ratio || "1:1",
        referenceAssets: gate.references,
      })
    : await (deps.genVideo || generateVideo)({
        prompt, negativePrompt: negative,
        aspectRatio: req.aspect_ratio || "9:16",
        duration: req.duration_s || 8,
        referenceAssets: gate.references,
      });

  const generated = gen.status === "generated" && gen.media_url;

  // Provider URLs can expire — re-host on Shopify Files when configured, and
  // record the provider host so the publisher's allowlist can trust it.
  let hosting = { hosted_url: null, hosted_file_id: null, hosted_pending: false, hosting_note: "" };
  if (generated) {
    hosting = await (deps.rehost || rehostMedia)(gen.media_url, {
      alt: `${base.brand_name || ""} ${base.creative_goal || ""}`.trim(),
      assetType: base.asset_type,
    });
  }

  // Vision pre-check: can auto-FAIL obvious product substitutions, never auto-pass.
  let visionCheck = { checked: false, verdict: "unclear", reasons: [] };
  if (generated) {
    try {
      visionCheck = await (deps.visionCheck || visionQaCheck)({
        mediaUrl: gen.media_url,
        thumbnailUrl: gen.thumbnail_url || gen.preview_url,
        assetType: base.asset_type,
        spec,
        referenceUrl: gate.references[0]?.url || null,
      });
    } catch { /* vision assist must never break generation */ }
  }

  return applyVisionVerdict({
    ...base,
    status: gen.available === false ? "manual" : gen.status,
    media_status: generated ? "generated" : gen.available === false ? "manual" : gen.status,
    generation_prompt: prompt,
    negative_prompt: negative,
    provider_job_id: gen.provider_job_id || null,
    media_url: hosting.hosted_url || gen.media_url || null,
    provider_media_url: gen.media_url || null,
    media_host: hostOf(hosting.hosted_url || gen.media_url),
    hosted_file_id: hosting.hosted_file_id,
    hosted_pending: hosting.hosted_pending,
    hosting_note: hosting.hosting_note,
    preview_url: gen.preview_url || null,
    thumbnail_url: gen.thumbnail_url || null,
    // Anything generated needs human eyes before it can post — always.
    visual_qa_status: generated ? "needs_review" : "not_generated",
    product_fidelity_notes: generated
      ? (gate.mode === "references"
        ? "generated against approved product reference assets — verify label/packaging fidelity before approval"
        : "generated from locked visual spec only (no reference images yet) — REQUIRES close visual QA before approval")
      : gen.notes || "",
  }, visionCheck);
}
