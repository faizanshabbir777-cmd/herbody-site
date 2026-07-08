// Vision QA assist — a Claude-vision pre-check on generated product media.
// It can only AUTO-FAIL obvious product substitutions (wrong packaging, invented
// label, random supplement); it can never auto-pass. A human "QA pass" in the
// dashboard remains the only way media becomes publishable. Degrades to a no-op
// without an Anthropic key or when the media can't be fetched.
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "./claude.js";
import { productPreservationClause } from "./product-assets.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function visionAvailable() {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

/** Fetch an image URL into a Claude image content block. Null when unusable. */
export async function fetchImageBlock(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const type = String(res.headers.get("content-type") || "").split(";")[0].trim();
    if (!IMAGE_TYPES.has(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;
    return { type: "image", source: { type: "base64", media_type: type, data: buf.toString("base64") } };
  } catch {
    return null;
  }
}

/**
 * Pre-check a generated asset against the product spec (and reference image
 * when available).
 * @returns { checked, verdict: "fail"|"unclear"|"looks_consistent", reasons }
 *   "looks_consistent" is NOT a pass — it just means no obvious substitution.
 */
export async function visionQaCheck({ mediaUrl, thumbnailUrl, assetType = "image", spec, referenceUrl = null }, deps = {}) {
  if (!visionAvailable()) return { checked: false, verdict: "unclear", reasons: ["no ANTHROPIC_API_KEY — vision pre-check skipped"] };
  // Videos are judged by their thumbnail/preview frame; no frame → can't check.
  const imageUrl = assetType === "image" ? (mediaUrl || thumbnailUrl) : (thumbnailUrl || null);
  if (!imageUrl) return { checked: false, verdict: "unclear", reasons: ["no still frame available for vision check"] };

  const candidate = await (deps.fetchImage || fetchImageBlock)(imageUrl);
  if (!candidate) return { checked: false, verdict: "unclear", reasons: ["media not fetchable as an image"] };
  const reference = referenceUrl ? await (deps.fetchImage || fetchImageBlock)(referenceUrl) : null;

  const client = deps.client || new Anthropic();
  const content = [
    { type: "text", text: "CANDIDATE generated asset:" },
    candidate,
    ...(reference ? [{ type: "text", text: "APPROVED product reference:" }, reference] : []),
    {
      type: "text",
      text: `Product spec: ${productPreservationClause(spec)}
Judge ONLY product fidelity, not creative quality. Call the tool once.`,
    },
  ];
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: "You are a strict product-fidelity checker for generated marketing assets. FAIL anything showing a different supplement product, invented/illegible label text presented as real, wrong packaging shape/colour, competitor branding, or no product at all. UNCLEAR when you cannot tell. LOOKS_CONSISTENT only when the product visibly matches the spec/reference.",
    tools: [{
      name: "verdict",
      description: "Emit the fidelity verdict. Call exactly once.",
      input_schema: {
        type: "object",
        required: ["verdict", "reasons"],
        properties: {
          verdict: { type: "string", enum: ["fail", "unclear", "looks_consistent"] },
          reasons: { type: "array", items: { type: "string" } },
        },
      },
    }],
    tool_choice: { type: "tool", name: "verdict" },
    messages: [{ role: "user", content }],
  });
  const call = res.content.find((b) => b.type === "tool_use" && b.name === "verdict");
  if (!call) return { checked: false, verdict: "unclear", reasons: ["model returned no verdict"] };
  return { checked: true, verdict: call.input.verdict, reasons: call.input.reasons || [] };
}

/**
 * Apply a vision verdict to creative metadata. Only ever DOWNGRADES:
 * fail → visual_qa_status "failed_auto" (blocked from auto-post and paid).
 */
export function applyVisionVerdict(creative = {}, check = {}) {
  if (!check.checked || check.verdict !== "fail") {
    return {
      ...creative,
      vision_qa: check.checked ? { verdict: check.verdict, reasons: check.reasons } : undefined,
    };
  }
  return {
    ...creative,
    visual_qa_status: "failed_auto",
    vision_qa: { verdict: "fail", reasons: check.reasons },
    product_fidelity_notes: `AUTO-FAILED by vision pre-check: ${check.reasons.join("; ")}`.slice(0, 400),
  };
}
