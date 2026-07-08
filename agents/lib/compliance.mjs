// Compliance gate — mechanical second pass over every queue draft BEFORE a human
// sees it in the approvals dashboard (and again before publishing). Verdict only:
// the gate never edits creative content, it stamps PASS / NEEDS_REVIEW / REJECT
// with machine-readable reasons. Advisory to the human, never a substitute.
//
// Rule sources: docs/REJECTED_CLAIMS.md patterns, brand hard rules (no problem-
// calling, no urgency fakery, DMCC review rules), UTM discipline, required fields.

/** Patterns that always REJECT — no compliant rewrite keeps them. */
export const REJECT_PATTERNS = [
  { re: /\b(cures?|treats?|prevents?|heals?)\b/i, reason: "disease/treatment claim (never permitted for supplements)" },
  { re: /\bbefore\s*(and|\/|&)?\s*after\b|\btransformation\b/i, reason: "before/after or transformation framing (hard-banned)" },
  { re: /\bclinically proven\b/i, reason: '"clinically proven" product claim (rejected claims list)' },
  { re: /\bguaranteed? (results?|gains?|growth)\b/i, reason: "results guarantee (only the flavour refund guarantee exists)" },
  { re: /\bdoctor recommended\b/i, reason: '"doctor recommended" (rejected claims list)' },
  { re: /\bverified buyer\b|\bas a customer\b|\bcustomer review\b/i, reason: "fabricated customer voice/review (DMCC Act 2024 — no reviews exist)" },
  { re: /\b(only \d+ left|selling fast|last chance|offer ends|hurry)\b/i, reason: "fake urgency/scarcity mechanic (hard-banned)" },
  { re: /\b(weight[\s-]?loss|fat[\s-]?burn(ing|er)?|slimming)\b/i, reason: "weight-loss framing (hard-banned)" },
  { re: /\b(cures?|fix(es)?)\s+(your\s+)?hormones?\b|\bbalances?\s+(your\s+)?hormones?\b/i, reason: "hormone-fixing promise (rejected claims list)" },
];

/** Patterns that force NEEDS_REVIEW — borderline, a human must look closely. */
export const REVIEW_PATTERNS = [
  { re: /\b(tired of|struggling with|fed up with|sick of)\b/i, reason: "possible problem-calling hook (brand hard rule — no viewer-problem framing)" },
  { re: /\b(boosts?|improves?|increases?)\s+(energy|strength|performance|focus|mood)\b/i, reason: "function claim — verify against authorised claim wording" },
  { re: /\b\d+\s*%\s*(off|discount)\b/i, reason: "discount claim — verify price facts before publishing" },
  { re: /\bfree\b/i, reason: '"free" claim — verify offer exists and terms are stated' },
  { re: /\b(best|no\.?\s?1|#1)\b/i, reason: "superlative claim — needs substantiation" },
  { re: /\bsafe\b/i, reason: "blanket safety wording — cautions/exclusions must be present" },
];

/** Text fields inspected on a queue item payload. */
export const TEXT_FIELDS = [
  "hook", "script", "voiceover", "caption", "title", "headline", "primary_text",
  "on_screen_text", "on_image_text", "cta", "ugc_variant", "alt_text", "generation_prompt", "visual_prompt",
];

export function textOf(payload = {}) {
  const parts = [];
  const collect = (obj) => {
    for (const f of TEXT_FIELDS) {
      const v = obj?.[f];
      if (Array.isArray(v)) parts.push(v.join(" "));
      else if (typeof v === "string") parts.push(v);
    }
  };
  collect(payload);
  // Paid drafts nest creative copy under campaigns[].creative — scan those too.
  for (const c of Array.isArray(payload.campaigns) ? payload.campaigns : []) {
    if (typeof c?.campaign_name === "string") parts.push(c.campaign_name);
    if (typeof c?.rationale === "string") parts.push(c.rationale);
    collect(c);
    collect(c?.creative);
  }
  return parts.join("\n");
}

const UTM_RE = /utm_source=[a-z0-9_-]+/i;

/**
 * Gate one queue item. Returns { verdict: "PASS"|"NEEDS_REVIEW"|"REJECT", reasons: [] }.
 * Structural rules apply to content items (posts/videos/images), not campaign shells.
 */
export function gateItem(item) {
  const payload = item?.payload || {};
  const reasons = [];
  const text = textOf(payload);

  for (const p of REJECT_PATTERNS) {
    if (p.re.test(text)) reasons.push(`REJECT: ${p.reason}`);
  }
  const rejected = reasons.length > 0;

  for (const p of REVIEW_PATTERNS) {
    if (p.re.test(text)) reasons.push(`REVIEW: ${p.reason}`);
  }

  // Structural checks for content drafts (not campaign/PPC shells or blocked checklists).
  const isContent = ["video", "image", "reel", "feed", "story", "carousel", "pin", "page_post", "post"].includes(item?.type)
    && payload.media_status !== "blocked_missing_product_spec";
  if (isContent) {
    const hasLanding = !!(payload.landing_url || payload.link);
    if (!hasLanding) reasons.push("REVIEW: no landing URL on the draft");
    const utm = String(payload.utm || payload.utm_content || payload.landing_url || payload.link || "");
    if (hasLanding && !UTM_RE.test(utm)) reasons.push("REVIEW: UTM parameters missing or malformed");
    if (!payload.caption && !payload.primary_text) reasons.push("REVIEW: no caption/primary text");
  }

  const verdict = rejected ? "REJECT" : reasons.length ? "NEEDS_REVIEW" : "PASS";
  return { verdict, reasons };
}

/**
 * Merge the gate verdict onto an item. The gate can only hold or DOWNGRADE the
 * drafting agent's self-assessment — it never upgrades to PASS on its own
 * unless the draft already claimed PASS and the gate agrees.
 */
export function applyGate(item, result = gateItem(item)) {
  const self = item.compliance_status || item.payload?.compliance_status || "NEEDS_REVIEW";
  let combined;
  if (result.verdict === "REJECT") combined = "REJECT";
  else if (result.verdict === "NEEDS_REVIEW" || self !== "PASS") combined = "NEEDS_REVIEW";
  else combined = "PASS";
  return {
    ...item,
    compliance_status: combined,
    payload: {
      ...(item.payload || {}),
      compliance_status: combined,
      compliance_gate: {
        verdict: result.verdict,
        reasons: result.reasons,
        checked_at: new Date().toISOString(),
      },
    },
  };
}
