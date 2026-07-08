// Ads push — the ONLY code path that touches live ad campaigns:
//  1. Creates human-approved paid drafts as PAUSED campaigns (always paused).
//  2. ENFORCE_STOP_LOSS=1: pauses live campaigns flagged by the stop-loss sweep.
// Heavy-gated by the ppc-push workflow: manual dispatch + "ads-production"
// GitHub environment + approvals/ADS_LAUNCH_APPROVAL.json. Budgets are
// re-clamped through the autonomy policy at push time. Campaign level only:
// ad groups / ad creatives are finished by a human in Ads Manager.
import { queueItems, decisions, markPublished, putDraft } from "./lib/queue.js";
import { exists, readJson, writeJson, nowIso } from "./lib/state.js";
import { tiktok, meta } from "./lib/platforms.js";
import { loadAutonomy, canAutoScale } from "./lib/autonomy.js";

const ENFORCE_STOP_LOSS = ["1", "true", "yes"].includes(String(process.env.ENFORCE_STOP_LOSS || "").toLowerCase());

// ---- stop-loss enforcement: pausing losers is the SAFE direction, so it runs
// even under the kill switch (it stops spend rather than starting it). ----
if (ENFORCE_STOP_LOSS) {
  const flags = readJson("data/state/paid-growth-latest.json", {}).stop_loss_flags || [];
  const results = [];
  for (const f of flags) {
    if (!f.campaign_id) { results.push({ ...f, action: "manual", note: "no campaign id — pause manually in Ads Manager" }); continue; }
    try {
      const api = f.platform === "tiktok" ? tiktok : f.platform === "meta" ? meta : null;
      const r = api ? await api.pauseCampaign(f.campaign_id) : { available: false };
      results.push({ ...f, action: r.available === false ? "manual" : "paused", note: r.available === false ? "no credentials" : `paused via API` });
    } catch (e) {
      results.push({ ...f, action: "failed", note: String(e.message).slice(0, 160) });
    }
  }
  writeJson("data/state/stop-loss-enforcement.json", { updated: nowIso(), results });
  console.log(`[ads-push] stop-loss enforcement: ${results.filter((r) => r.action === "paused").length}/${flags.length} campaign(s) paused`);
}

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
    // Idempotent retries: campaigns already created on a previous run are never re-pushed.
    if (c.push_status === "api" && c.pushed_campaign_id) {
      results.push({ campaign: c.campaign_name, mode: "already-pushed", detail: `campaign ${c.pushed_campaign_id} created on a previous run` });
      continue;
    }
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
        c.push_status = "ready-manual";
        results.push({ campaign: c.campaign_name, mode: "ready-manual", detail: `no ${c.platform} credentials — create manually from the draft spec` });
        manual++;
      } else {
        c.push_status = "api";
        c.pushed_campaign_id = r.id;
        results.push({ campaign: c.campaign_name, mode: "api", detail: `${c.platform} campaign ${r.id} created PAUSED (£${budget}/day) — finish ad groups/creatives + enable in Ads Manager` });
        fleetSpendPlanned += budget;
        itemPushed++;
        pushed++;
      }
    } catch (e) {
      c.push_status = "failed";
      results.push({ campaign: c.campaign_name, mode: "failed", detail: String(e.message).slice(0, 200) });
    }
  }
  const skippedAll = results.length && results.every((r) => r.mode === "skipped");
  if (skippedAll) {
    // Entirely outside the dispatched channel — leave the item in the queue untouched.
    console.log(`[ads-push] ${item.id}: all campaigns outside channel "${CHANNEL}" — left in queue`);
    continue;
  }
  // Persist per-campaign push state on the draft (idempotent retries read it back).
  putDraft(item.agent, { ...item, payload: { ...item.payload, campaigns } });
  // Only mark the ITEM published when every campaign reached a terminal state
  // (api / already-pushed / ready-manual). Failed or budget-blocked campaigns
  // keep the item in the queue so a later run can retry the remainder.
  const unresolved = results.filter((r) => r.mode === "failed" || r.mode === "blocked");
  if (unresolved.length) {
    console.log(`[ads-push] ${item.id}: ${unresolved.length} campaign(s) unresolved (${unresolved.map((r) => r.mode).join(", ")}) — left in queue for retry`);
    continue;
  }
  markPublished(item, {
    mode: itemPushed ? "api" : "ready-manual",
    detail: results.map((r) => `${r.campaign}: ${r.mode} — ${r.detail}`).join(" | ").slice(0, 900),
  });
  console.log(`[ads-push] ${item.id}: ${results.length} campaign(s) processed (${itemPushed} pushed)`);
}

console.log(`[ads-push] done · ${pushed} pushed PAUSED · ${manual} ready-manual · ${blocked} blocked by budget cap`);
