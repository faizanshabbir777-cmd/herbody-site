// Ads push — the ONLY code path that creates campaigns on ad platforms, and it
// creates them PAUSED, always. Heavy-gated by the ppc-push workflow: manual
// dispatch + "ads-production" GitHub environment + approvals/ADS_LAUNCH_APPROVAL.json.
// Pushes only paid queue items a human approved in data/approvals.json.
// Budgets are re-clamped through the autonomy policy at push time — a stale or
// hand-edited draft can never exceed the fleet cap. Campaign level only:
// ad groups / ad creatives are finished by a human in Ads Manager.
import { queueItems, decisions, markPublished } from "./lib/queue.js";
import { exists } from "./lib/state.js";
import { tiktok, meta } from "./lib/platforms.js";
import { loadAutonomy, canAutoScale } from "./lib/autonomy.js";

if (!exists("approvals/ADS_LAUNCH_APPROVAL.json")) {
  console.log("[ads-push] approvals/ADS_LAUNCH_APPROVAL.json missing — nothing pushed (drafts stay in the repo)");
  process.exit(0);
}

const policy = loadAutonomy();
if (policy.kill_switch) {
  console.log("[ads-push] kill switch active — nothing pushed");
  process.exit(0);
}

// Workflow dispatch input: which channel to push (google/meta/tiktok/all).
// Google has no API path (Ads Editor CSVs); meta/tiktok filter the campaign list.
const CHANNEL = (process.env.PUSH_CHANNEL || "all").toLowerCase();
const channelAllows = (platform) =>
  CHANNEL === "all" || CHANNEL === platform;

const dec = decisions();
const paidItems = queueItems().filter(
  ({ item }) => item.agent === "paid" && item.type === "campaign" && dec.get(item.id)?.status === "approved"
);

if (!paidItems.length) {
  console.log("[ads-push] no approved paid campaign drafts in the queue — done");
  process.exit(0);
}

let pushed = 0, manual = 0, blocked = 0;
let fleetSpendPlanned = 0;

for (const { item } of paidItems) {
  const campaigns = item.payload?.campaigns || [];
  const results = [];
  let itemPushed = 0;
  for (const c of campaigns) {
    if (!channelAllows(c.platform)) {
      results.push({ campaign: c.campaign_name, mode: "skipped", detail: `channel filter "${CHANNEL}" excludes ${c.platform}` });
      continue;
    }
    // Re-clamp at push time — the policy is authoritative, not the draft.
    const scale = canAutoScale(
      { ...policy, mode: "auto_scale_ads", kill_switch: false }, // budget maths only; gating happened above
      { proposedDailyBudgetGbp: c.daily_budget_gbp || 5, fleetDailySpendGbp: fleetSpendPlanned }
    );
    if (!scale.ok && /cap/.test(scale.reason)) {
      results.push({ campaign: c.campaign_name, mode: "blocked", detail: scale.reason });
      blocked++;
      continue;
    }
    const budget = scale.budget;
    try {
      let r = { available: false };
      if (c.platform === "tiktok") {
        r = await tiktok.createCampaignPaused({ name: c.campaign_name, dailyBudgetGbp: budget });
      } else if (c.platform === "meta") {
        r = await meta.createCampaignPaused({ name: c.campaign_name, dailyBudgetGbp: budget });
      }
      if (r.available === false) {
        results.push({ campaign: c.campaign_name, mode: "ready-manual", detail: `no ${c.platform} credentials — create manually from the draft spec` });
        manual++;
      } else {
        results.push({ campaign: c.campaign_name, mode: "api", detail: `${c.platform} campaign ${r.id} created PAUSED (£${budget}/day) — finish ad groups/creatives + enable in Ads Manager` });
        fleetSpendPlanned += budget;
        itemPushed++;
        pushed++;
      }
    } catch (e) {
      results.push({ campaign: c.campaign_name, mode: "failed", detail: String(e.message).slice(0, 200) });
    }
  }
  const skippedAll = results.length && results.every((r) => r.mode === "skipped");
  if (skippedAll) {
    // Entirely outside the dispatched channel — leave the item in the queue untouched.
    console.log(`[ads-push] ${item.id}: all campaigns outside channel "${CHANNEL}" — left in queue`);
    continue;
  }
  markPublished(item, {
    mode: itemPushed ? "api" : "ready-manual",
    detail: results.map((r) => `${r.campaign}: ${r.mode} — ${r.detail}`).join(" | ").slice(0, 900),
  });
  console.log(`[ads-push] ${item.id}: ${results.length} campaign(s) processed (${itemPushed} pushed)`);
}

console.log(`[ads-push] done · ${pushed} pushed PAUSED · ${manual} ready-manual · ${blocked} blocked by budget cap`);
