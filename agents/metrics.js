// Metrics collector — runs FIRST in the fleet. Pulls whatever platforms are reachable
// (each degrades gracefully) into data/metrics/, and maintains latest.json for the
// dashboards + agents. No Anthropic call — pure collection.
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

// strip availability flags for cleanliness
for (const k of ["shopify", "tiktok", "meta", "gads"]) {
  if (out[k] && typeof out[k] === "object") delete out[k].available;
}

writeJson(`data/metrics/shopify/${today()}.json`, { date: today(), ...out.shopify });
writeJson("data/metrics/latest.json", out);
console.log(`[metrics] updated · notes: ${out.notes.join(" | ") || "all sources ok"}`);
