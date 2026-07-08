// Autonomy policy — the ONLY place automatic behaviour is decided.
// Mode ladder: draft_only < auto_generate < auto_post_organic < auto_scale_ads.
// kill_switch:true stops all automatic generation/posting/scaling instantly.
import { readJson, today } from "./state.js";

export const AUTONOMY_PATH = "data/config/autonomy.json";
export const MODES = ["draft_only", "auto_generate", "auto_post_organic", "auto_scale_ads"];

export const DEFAULT_POLICY = {
  mode: "draft_only",
  kill_switch: false,
  allowed_platforms: [],
  max_posts_per_day_by_platform: {},
  requires_visual_qa_pass: true,
  requires_compliance_pass: true,
  // OmniFlash editorial verdict required on TikTok items before auto-posting.
  requires_editorial_pass: true,
  // Pre-audit TikTok apps can only create SELF_ONLY (private) posts — burning
  // daily caps on invisible posts. Off until the app passes TikTok's audit.
  allow_self_only_tiktok_posts: false,
  ads: {
    max_daily_ad_budget_gbp: 25,
    max_budget_increase_pct: 20,
    stop_loss_spend_gbp: 40,
    min_roas_gate: 1.5,
    max_cpa_gbp_gate: 25,
  },
  winner_thresholds: {
    min_impressions: 2000,
    min_engagement_rate_pct: 6,
    min_completion_rate_pct: 25,
    promising_engagement_rate_pct: 3.5,
    fatigue_drop_pct: 50,
  },
};

export function loadAutonomy() {
  const p = readJson(AUTONOMY_PATH, {});
  return {
    ...DEFAULT_POLICY, ...p,
    ads: { ...DEFAULT_POLICY.ads, ...(p.ads || {}) },
    winner_thresholds: { ...DEFAULT_POLICY.winner_thresholds, ...(p.winner_thresholds || {}) },
  };
}

function modeRank(mode) {
  const i = MODES.indexOf(mode);
  return i < 0 ? 0 : i;
}

/** action: "generate" | "post_organic" | "scale_ads" */
export function modeAllows(policy, action) {
  if (!policy || policy.kill_switch === true) return false;
  const need = { generate: 1, post_organic: 2, scale_ads: 3 }[action];
  if (need == null) return false;
  return modeRank(policy.mode) >= need;
}

/**
 * May this queue item be auto-published organically right now?
 * @param {object} policy autonomy policy
 * @param {object} item queue item { platform, scheduled_for, compliance_status, payload }
 * @param {object} postedTodayByPlatform e.g. { tiktok: 1 }
 * @param {object} [opts] { todayStr } injectable clock for tests
 * @returns { ok, reason }
 */
export function canAutoPost(policy, item, postedTodayByPlatform = {}, opts = {}) {
  if (!policy || policy.kill_switch === true) return { ok: false, reason: "kill switch active" };
  if (!modeAllows(policy, "post_organic")) return { ok: false, reason: `mode "${policy.mode}" does not allow auto posting` };
  const platform = item?.platform;
  if (!(policy.allowed_platforms || []).includes(platform)) return { ok: false, reason: `platform "${platform}" not in allowed_platforms` };
  if (platform === "tiktok" && policy.allow_self_only_tiktok_posts !== true) {
    return { ok: false, reason: "TikTok app pre-audit — API posts are SELF_ONLY (private); set allow_self_only_tiktok_posts:true only if that is acceptable, or wait for the audit" };
  }
  // Only items scheduled for TODAY auto-post — stale undecided drafts from prior
  // days stay in the queue for a human instead of suddenly going live.
  const todayStr = opts.todayStr || today();
  if (item?.scheduled_for !== todayStr) {
    return { ok: false, reason: `scheduled_for "${item?.scheduled_for || "missing"}" is not today (${todayStr}) — stale drafts never auto-post` };
  }
  const cap = (policy.max_posts_per_day_by_platform || {})[platform];
  if (cap == null) return { ok: false, reason: `no daily cap configured for "${platform}"` };
  if ((postedTodayByPlatform[platform] || 0) >= cap) return { ok: false, reason: `daily cap reached for "${platform}" (${cap})` };
  const compliance = item?.compliance_status || item?.payload?.compliance_status;
  if (policy.requires_compliance_pass && compliance !== "PASS") return { ok: false, reason: `compliance_status "${compliance}" is not PASS` };
  // Fail closed: the MECHANICAL gate must also have stamped PASS — a drafting
  // agent's self-assessment alone never unlocks autonomous posting.
  const gateVerdict = item?.payload?.compliance_gate?.verdict;
  if (policy.requires_compliance_pass && gateVerdict !== "PASS") {
    return { ok: false, reason: `compliance gate verdict "${gateVerdict || "missing"}" is not PASS (run compliance-gate.js)` };
  }
  const qa = item?.payload?.visual_qa_status;
  if (policy.requires_visual_qa_pass && qa !== "pass") {
    return { ok: false, reason: `visual_qa_status "${qa || "missing"}" is not pass — a human must visually approve generated product media` };
  }
  // TikTok items must carry OmniFlash's editorial approval when required.
  if (platform === "tiktok" && policy.requires_editorial_pass !== false) {
    const editorial = item?.payload?.editorial?.verdict;
    if (editorial !== "approved") {
      return { ok: false, reason: `editorial verdict "${editorial || "missing"}" is not approved — OmniFlash must review TikTok items first` };
    }
  }
  // TikTok/IG API posting needs a hosted media URL — without one the item can
  // only ever become ready-manual, so it is not auto-post eligible.
  if ((platform === "tiktok" || platform === "instagram") &&
      !item?.payload?.video_url && !item?.payload?.image_url && !item?.payload?.media_url) {
    return { ok: false, reason: "no hosted media URL in payload — API posting impossible, needs manual post" };
  }
  return { ok: true, reason: "eligible for auto post" };
}

/**
 * May the paid agents create/adjust this budget automatically?
 * @returns { ok, reason, budget } budget clamped to caps.
 */
export function canAutoScale(policy, { currentDailyBudgetGbp = 0, proposedDailyBudgetGbp = 0, fleetDailySpendGbp = 0 } = {}) {
  const cap = policy?.ads?.max_daily_ad_budget_gbp ?? 25;
  const clamped = Math.min(proposedDailyBudgetGbp, cap);
  if (!policy || policy.kill_switch === true) return { ok: false, reason: "kill switch active", budget: 0 };
  if (!modeAllows(policy, "scale_ads")) return { ok: false, reason: `mode "${policy.mode}" does not allow auto scaling — drafts stay PAUSED`, budget: clamped };
  if (fleetDailySpendGbp + clamped > cap) return { ok: false, reason: `fleet daily budget cap £${cap} would be exceeded`, budget: clamped };
  if (currentDailyBudgetGbp > 0) {
    const maxInc = policy.ads.max_budget_increase_pct ?? 20;
    const ceiling = currentDailyBudgetGbp * (1 + maxInc / 100);
    if (clamped > ceiling) {
      return { ok: false, reason: `increase exceeds max_budget_increase_pct (${maxInc}%)`, budget: Math.min(ceiling, cap) };
    }
  }
  return { ok: true, reason: "within budget policy", budget: clamped };
}

/** Stop-loss: spend past threshold with no conversion signal → pause/flag. */
export function stopLossTriggered(policy, { spendGbp = 0, conversions = 0, roas = null, cpaGbp = null } = {}) {
  const ads = policy?.ads || DEFAULT_POLICY.ads;
  if (spendGbp >= (ads.stop_loss_spend_gbp ?? 40) && conversions === 0) {
    return { triggered: true, reason: `£${spendGbp} spent with zero conversions (stop-loss £${ads.stop_loss_spend_gbp})` };
  }
  if (roas != null && roas < (ads.min_roas_gate ?? 1.5) && spendGbp >= (ads.stop_loss_spend_gbp ?? 40) / 2) {
    return { triggered: true, reason: `ROAS ${roas} below gate ${ads.min_roas_gate} at meaningful spend` };
  }
  if (cpaGbp != null && cpaGbp > (ads.max_cpa_gbp_gate ?? 25)) {
    return { triggered: true, reason: `CPA £${cpaGbp} above gate £${ads.max_cpa_gbp_gate}` };
  }
  return { triggered: false, reason: "" };
}

const ukDateOf = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

/** Count today's auto/API publishes per platform from the published index (UK day). */
export function postedTodayByPlatform(publishedItems = [], todayStr = today()) {
  const counts = {};
  for (const p of publishedItems) {
    if (ukDateOf(p.published_at) !== todayStr) continue;
    if (p.mode === "ready-manual") continue;
    counts[p.platform] = (counts[p.platform] || 0) + 1;
  }
  return counts;
}
