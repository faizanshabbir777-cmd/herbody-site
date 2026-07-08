// TikTok Shop ads agent — HARD-GATED on Shop category approval. Until
// product-assets.json → tiktok_shop.approved is true, this agent only maintains
// the readiness checklist and routes nothing to Shop (paid traffic stays on the
// DTC website PDP via paid-growth). Once approved, it drafts PAUSED Shop-format
// campaigns (GMV Max / Product Shopping Ads) from winning creatives.
import { readJson, writeJson, loadMemory, saveMemory, today, nowIso } from "./lib/state.js";
import { putDraft } from "./lib/queue.js";
import { loadAutonomy, canAutoScale, modeAllows } from "./lib/autonomy.js";
import { loadProductSpec } from "./lib/product-assets.js";
import { campaignPrefix } from "./lib/utm.js";
import { qaDecisions } from "./lib/visual-qa.js";

const qa = qaDecisions();

const spec = loadProductSpec();
const policy = loadAutonomy();
const approved = spec?.tiktok_shop?.approved === true;

if (!approved) {
  writeJson("data/state/tiktok-shop-readiness.json", {
    updated: nowIso(),
    approved: false,
    blockers: [
      "TikTok Shop UK category approval for food supplements not confirmed",
      "Final label artwork incl. food supplement statement + pregnancy/nursing caution",
      "COA per lot available on request",
      "Business documents submitted and verified in Seller Center",
      "Set tiktok_shop.approved:true in data/config/product-assets.json once complete",
    ],
    routing: "All paid traffic routes to the DTC website PDP until approved.",
  });
  console.log("[tiktok-shop-ads] Shop not approved — readiness checklist maintained, no Shop campaigns drafted");
  process.exit(0);
}

const perf = readJson("data/state/creative-performance.json", { labels: [] });
const winners = (perf.labels || []).filter(
  (l) => l.label === "winner" && l.platform === "tiktok"
    && (!policy.requires_visual_qa_pass || (qa.get(l.creative_id)?.status || l.visual_qa_status) === "pass")
    && (!policy.requires_compliance_pass || l.compliance_status === "PASS")
);

const drafts = [];
// Seed the budget counter with what paid-growth already planned TODAY, so both
// agents share ONE fleet-wide daily cap instead of each starting from zero.
const paidState = readJson("data/state/paid-growth-latest.json", {});
let planned = paidState.date === today() ? paidState.planned_daily_spend_gbp || 0 : 0;
for (const w of winners) {
  const scale = canAutoScale(policy, { proposedDailyBudgetGbp: 10, fleetDailySpendGbp: planned });
  drafts.push({
    campaign_name: `${campaignPrefix(spec)}_TTSHOP_${String(w.creative_id || w.post_id || "X").replace(/[^a-zA-Z0-9]+/g, "").slice(0, 24).toUpperCase()}`,
    platform: "tiktok",
    ad_format: "product_shopping_ads",
    status: "PAUSED",
    daily_budget_gbp: scale.budget,
    destination: "tiktok_shop",
    creative: {
      creative_id: w.creative_id || null,
      post_id: w.post_id || null,
      media_url: w.media_url || null,
      hook: w.hook || "",
      utm_content: w.utm_content || "",
    },
    auto_scale_eligible: scale.ok && modeAllows(policy, "scale_ads"),
    auto_scale_note: scale.reason,
  });
  planned += scale.budget;
}

if (drafts.length) {
  putDraft("paid", {
    id: `${today()}-tiktok-shop-winner-ads`,
    // platform "ppc": campaign drafts must never hit the organic posting path in publish.js
    platform: "ppc",
    type: "campaign",
    title: `TikTok Shop ads from ${drafts.length} winning creative(s) — all PAUSED`,
    compliance_status: "NEEDS_REVIEW",
    payload: { campaigns: drafts },
  });
}
const mem = loadMemory("paid");
saveMemory("paid", {
  ...mem,
  agent: "paid",
  recent_actions: [...(mem.recent_actions || []), `${today()}: tiktok-shop-ads drafted ${drafts.length} Shop campaign(s)`],
});
console.log(`[tiktok-shop-ads] ${drafts.length} paused Shop campaign draft(s) from winners · mode ${policy.mode}`);
