// Metrics collector — runs FIRST in the fleet. Pulls whatever platforms are reachable
// (each degrades gracefully) into data/metrics/, and maintains latest.json for the
// dashboards + agents. Also rolls up CREATIVE-level organic metrics (per published
// post) into data/metrics/creative/ for the winner-selection loop.
// No Anthropic call — pure collection.
import { shopify, tiktok, meta, gads } from "./lib/platforms.js";
import { writeJson, readJson, today, nowIso } from "./lib/state.js";

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

// Join platform rows onto published queue items by utm_content in caption, else by title.
const published = readJson("data/published/index.json", { items: [] }).items || [];
const platformRows = [...(organicTikTok.rows || []), ...(organicIG.rows || [])];
const creativeRows = [];
for (const p of published) {
  const full = readJson(`data/published/${p.id}.json`, {});
  const payload = full.payload || {};
  const match = platformRows.find(
    (r) => r.platform === p.platform &&
      (payload.utm && r.title?.includes?.(String(payload.utm))
        || (p.title && r.title && r.title.slice(0, 40) === p.title.slice(0, 40)))
  );
  creativeRows.push({
    creative_id: p.id,
    post_id: match?.post_id || null,
    platform: p.platform,
    asset_type: full.payload?.asset_type || (p.agent === "image" ? "image" : "video"),
    hook: payload.hook || "",
    trend_basis: payload.trend_basis || "",
    utm_content: payload.utm || payload.utm_content || "",
    published_at: p.published_at,
    media_url: payload.video_url || payload.image_url || payload.media_url || null,
    product_spec_version: payload.product_spec_version || null,
    visual_qa_status: payload.visual_qa_status || null,
    compliance_status: full.compliance_status || payload.compliance_status || null,
    views: match?.views || 0,
    impressions: match?.impressions || match?.views || 0,
    likes: match?.likes || 0,
    comments: match?.comments || 0,
    shares: match?.shares || 0,
    saves: match?.saves || 0,
    matched: !!match,
  });
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
console.log(`[metrics] updated · ${creativeRows.length} creative row(s) · notes: ${out.notes.join(" | ") || "all sources ok"}`);
