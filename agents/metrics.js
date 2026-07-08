// Metrics collector — runs FIRST in the fleet. Pulls whatever platforms are reachable
// (each degrades gracefully) into data/metrics/, and maintains latest.json for the
// dashboards + agents. Also rolls up CREATIVE-level organic metrics (per published
// post) into data/metrics/creative/ for the winner-selection loop.
// No Anthropic call — pure collection.
import { shopify, tiktok, meta, gads } from "./lib/platforms.js";
import { writeJson, readJson, today, nowIso, pruneMetrics } from "./lib/state.js";
import { matchPlatformRow, buildCreativeRow } from "./lib/creative-metrics.js";

const out = { updated: nowIso(), shopify: {}, tiktok: {}, meta: {}, gads: {}, notes: [] };

async function safe(name, fn) {
  try {
    const r = await fn();
    if (r?.available === false) {
      out.notes.push(`${name}: no credentials — skipped`);
      return {};
    }
    return r;
  } catch (e) {
    out.notes.push(`${name}: ERROR ${String(e.message).slice(0, 160)}`);
    return {};
  }
}

out.shopify = await safe("shopify", () => shopify.orderStats());
out.tiktok = await safe("tiktok-ads", () => tiktok.adInsights());
out.meta = await safe("meta-ads", () => meta.adInsights());
out.gads = await safe(
  "google-ads",
  () => gads.search(
    `SELECT campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
     FROM campaign WHERE segments.date DURING LAST_7_DAYS`
  )
);

// ---- creative-level organic rollup (winner-selection input) ----
const organicTikTok = await safe("tiktok-organic", () => tiktok.organicVideoMetrics());
const organicIG = await safe("ig-organic", () => meta.igMediaMetrics());
const revenue = await safe("shopify-utm-revenue", () => shopify.revenueByUtmContent());
const revenueByUtm = revenue.by_utm_content || {};

// Join platform rows onto published queue items (see lib/creative-metrics.js
// for the match priority: platform_post_id → utm_content → caption prefix).
const published = readJson("data/published/index.json", { items: [] }).items || [];
const platformRows = [...(organicTikTok.rows || []), ...(organicIG.rows || [])];
const creativeRows = [];
for (const p of published) {
  const full = readJson(`data/published/${p.id}.json`, {});
  const match = matchPlatformRow(p, full.payload || {}, platformRows);
  const row = buildCreativeRow(p, full, match);
  // Revenue attribution: orders whose last visit carried this creative's utm_content.
  const rev = row.utm_content ? revenueByUtm[String(row.utm_content).toLowerCase()] : null;
  row.orders = rev?.orders || 0;
  row.revenue_gbp = rev?.revenue_gbp || 0;
  creativeRows.push(row);
}
// Unmatched platform rows still count — they may be manual posts.
for (const r of platformRows) {
  if (!creativeRows.some((c) => c.post_id === r.post_id)) {
    creativeRows.push({
      creative_id: null, matched: false, saves: 0, shares: r.shares || 0,
      impressions: r.impressions || r.views || 0, ...r,
    });
  }
}
const creative = { updated: nowIso(), rows: creativeRows };
writeJson(`data/metrics/creative/${today()}.json`, creative);
writeJson("data/metrics/creative/latest.json", creative);

// strip availability flags for cleanliness
for (const k of ["shopify", "tiktok", "meta", "gads"]) {
  if (out[k] && typeof out[k] === "object") delete out[k].available;
}

writeJson(`data/metrics/shopify/${today()}.json`, { date: today(), ...out.shopify });
writeJson("data/metrics/latest.json", out);

// retention: dated snapshots older than 90 days are pruned (monthly firsts kept)
pruneMetrics("data/metrics/creative");
pruneMetrics("data/metrics/shopify");
console.log(`[metrics] updated · ${creativeRows.length} creative row(s) · notes: ${out.notes.join(" | ") || "all sources ok"}`);
