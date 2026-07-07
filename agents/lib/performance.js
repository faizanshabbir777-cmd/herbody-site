// Creative performance — mechanical winner selection + paid-scaling gates.
// Pure functions (injectable data) so the whole loop is unit-testable without
// platform credentials. Labels: winner | promising | fatigue | reject.

/** Engagement rate % from a normalized creative metric row. */
export function engagementRatePct(row = {}) {
  const impressions = row.impressions || row.views || 0;
  if (!impressions) return 0;
  const engagements = (row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.saves || 0);
  return Math.round((engagements / impressions) * 10000) / 100;
}

/**
 * Label a single creative row against thresholds.
 * @returns { label, reason, recommended_action }
 */
export function labelCreative(row = {}, thresholds = {}) {
  const t = {
    min_impressions: 2000,
    min_engagement_rate_pct: 6,
    min_completion_rate_pct: 25,
    promising_engagement_rate_pct: 3.5,
    fatigue_drop_pct: 50,
    ...thresholds,
  };
  const impressions = row.impressions || row.views || 0;
  const er = engagementRatePct(row);
  const completion = row.completion_rate_pct ?? null;

  if (impressions < t.min_impressions) {
    return { label: "promising", reason: `only ${impressions} impressions — not enough data`, recommended_action: "keep organic; repost variant or wait for more reach" };
  }
  if (row.trend_delta_pct != null && row.trend_delta_pct <= -t.fatigue_drop_pct) {
    return { label: "fatigue", reason: `engagement dropped ${Math.abs(row.trend_delta_pct)}% vs prior period`, recommended_action: "retire creative; brief a fresh variant on the same angle" };
  }
  const completionOk = completion == null || completion >= t.min_completion_rate_pct;
  if (er >= t.min_engagement_rate_pct && completionOk) {
    return { label: "winner", reason: `ER ${er}% ≥ ${t.min_engagement_rate_pct}%${completion != null ? ` · completion ${completion}%` : ""} at ${impressions} impressions`, recommended_action: "promote to paid test (PAUSED draft unless auto_scale_ads)" };
  }
  if (er >= t.promising_engagement_rate_pct) {
    return { label: "promising", reason: `ER ${er}% between promising (${t.promising_engagement_rate_pct}%) and winner (${t.min_engagement_rate_pct}%) gates`, recommended_action: "iterate hook/first-2s and repost" };
  }
  return { label: "reject", reason: `ER ${er}% below promising gate at ${impressions} impressions`, recommended_action: "drop angle; do not spend on it" };
}

/** Label a full set of rows → [{...row, label, reason, recommended_action}]. */
export function labelAll(rows = [], thresholds = {}) {
  return rows.map((r) => ({ ...r, ...labelCreative(r, thresholds) }));
}

/** Winners eligible for paid promotion (enough signal + winner label). */
export function paidTestCandidates(labelledRows = []) {
  return labelledRows.filter((r) => r.label === "winner");
}

/**
 * Build a PAUSED paid-test campaign draft from a winning creative.
 * Routes to the DTC website until TikTok Shop is approved.
 */
export function paidTestDraft(winner, { budgetGbp = 10, tiktokShopApproved = false, landingUrl = "" } = {}) {
  const platform = winner.platform === "instagram" || winner.platform === "facebook" ? "meta" : winner.platform || "tiktok";
  const name = `PLN_UK_${platform.toUpperCase()}_WINNER_${String(winner.creative_id || winner.post_id || "X").replace(/[^a-zA-Z0-9]+/g, "").slice(0, 24).toUpperCase()}`;
  return {
    campaign_name: name,
    platform,
    status: "PAUSED",
    objective: "conversions",
    daily_budget_gbp: budgetGbp,
    destination: tiktokShopApproved && platform === "tiktok" ? "tiktok_shop" : "website_pdp",
    landing_url: landingUrl,
    creative: {
      creative_id: winner.creative_id || null,
      post_id: winner.post_id || null,
      asset_type: winner.asset_type || "video",
      media_url: winner.media_url || null,
      hook: winner.hook || "",
      trend_basis: winner.trend_basis || "",
      utm_content: winner.utm_content || "",
      product_spec_version: winner.product_spec_version || null,
      visual_qa_status: winner.visual_qa_status || null,
      compliance_status: winner.compliance_status || "NEEDS_REVIEW",
    },
    rationale: winner.reason || "",
  };
}
