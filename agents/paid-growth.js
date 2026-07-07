// Paid growth agent — turns WINNING organic creatives into paid test campaign
// drafts (Meta / TikTok / Google) to scale the DTC website. Mechanical (no LLM):
// winner selection already happened in creative-performance; this agent applies
// budget policy and queues PAUSED drafts. Campaigns only run unpaused when a
// human approves them — or, in mode auto_scale_ads, within the budget/stop-loss
// gates of data/config/autonomy.json.
import { readJson, writeJson, loadMemory, saveMemory, today, nowIso } from "./lib/state.js";
import { putDraft } from "./lib/queue.js";
import { loadAutonomy, canAutoScale, stopLossTriggered, modeAllows } from "./lib/autonomy.js";
import { paidTestDraft } from "./lib/performance.js";
import { loadProductSpec } from "./lib/product-assets.js";

const policy = loadAutonomy();
const spec = loadProductSpec();
const perf = readJson("data/state/creative-performance.json", { labels: [] });
const budgets = readJson("data/config/budgets.json", {});
const metrics = readJson("data/metrics/latest.json", {});

const tiktokShopApproved = spec?.tiktok_shop?.approved === true;
const landingUrl = spec?.website_product_url || "";
const winners = (perf.labels || []).filter((l) => l.label === "winner");

// Stop-loss sweep over live ad rows (flag only — pausing needs the publisher/human).
// Meta insights put conversions inside the `actions` array; TikTok integrated
// reports nest metrics under `row.metrics` — normalise both before judging.
function spendConversionsOf(src, row) {
  const m = row.metrics || row;
  const spend = parseFloat(m.spend ?? row.spend ?? 0) || 0;
  let conversions = parseFloat(m.conversion ?? m.conversions ?? row.conversion ?? row.conversions ?? 0) || 0;
  if (src === "meta" && Array.isArray(row.actions)) {
    conversions = row.actions
      .filter((a) => /purchase|complete_payment|conversion/i.test(String(a.action_type || "")))
      .reduce((s, a) => s + (parseFloat(a.value) || 0), 0);
  }
  return { spend, conversions };
}
const stopLossFlags = [];
for (const src of ["tiktok", "meta"]) {
  for (const row of metrics?.[src]?.rows || []) {
    const { spend, conversions } = spendConversionsOf(src, row);
    const sl = stopLossTriggered(policy, { spendGbp: spend, conversions });
    if (sl.triggered) stopLossFlags.push({ platform: src, campaign: row.campaign_id || row.campaign_name || row.dimensions?.campaign_id || "?", ...sl });
  }
}

const drafts = [];
let fleetSpendPlanned = 0;
for (const w of winners) {
  // Never promote creative that failed product-fidelity QA or compliance.
  if (policy.requires_visual_qa_pass && w.visual_qa_status !== "pass") {
    console.log(`[paid-growth] skip ${w.creative_id || w.post_id}: visual_qa_status "${w.visual_qa_status || "missing"}" is not pass`);
    continue;
  }
  if (policy.requires_compliance_pass && w.compliance_status !== "PASS") {
    console.log(`[paid-growth] skip ${w.creative_id || w.post_id}: compliance_status "${w.compliance_status || "missing"}" is not PASS`);
    continue;
  }
  const proposed = 10;
  const scale = canAutoScale(policy, {
    proposedDailyBudgetGbp: proposed,
    fleetDailySpendGbp: fleetSpendPlanned,
  });
  const draft = paidTestDraft(w, {
    budgetGbp: scale.budget,
    tiktokShopApproved,
    landingUrl,
  });
  // Drafts are ALWAYS PAUSED; auto_scale_ads only marks eligibility for the push tooling.
  draft.auto_scale_eligible = scale.ok && modeAllows(policy, "scale_ads");
  draft.auto_scale_note = scale.reason;
  drafts.push(draft);
  fleetSpendPlanned += scale.budget;
}

if (drafts.length) {
  putDraft("paid", {
    id: `${today()}-paid-winner-tests`,
    platform: "ppc",
    type: "campaign",
    title: `Paid tests from ${drafts.length} winning creative(s) — all PAUSED`,
    compliance_status: "NEEDS_REVIEW",
    payload: {
      mode: policy.mode,
      destination_note: tiktokShopApproved ? "TikTok Shop approved — tiktok drafts may target Shop" : "TikTok Shop NOT approved — all traffic routes to the website PDP",
      campaigns: drafts,
      stop_loss_flags: stopLossFlags,
    },
  });
}
writeJson("data/state/paid-growth-latest.json", {
  updated: nowIso(), date: today(), winners_considered: winners.length,
  drafts_created: drafts.length, planned_daily_spend_gbp: fleetSpendPlanned,
  stop_loss_flags: stopLossFlags,
});

const mem = loadMemory("paid");
saveMemory("paid", {
  ...mem,
  agent: "paid",
  recent_actions: [...(mem.recent_actions || []), `${today()}: ${drafts.length} paid draft(s) from ${winners.length} winner(s); ${stopLossFlags.length} stop-loss flag(s)`],
});
console.log(`[paid-growth] ${drafts.length} paused paid draft(s) from ${winners.length} winner(s) · ${stopLossFlags.length} stop-loss flag(s) · mode ${policy.mode}`);
