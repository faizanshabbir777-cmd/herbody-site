// Doctor — integration presence check, run FIRST in the fleet. Presence-only
// (no API calls, no cost): which integrations are live vs degraded, so partial-
// credential states are visible in the brief and dashboard instead of silent.
import { writeJson, nowIso } from "./lib/state.js";

const has = (...keys) => keys.every((k) => !!process.env[k]?.trim());

const integrations = {
  anthropic: has("ANTHROPIC_API_KEY"),
  shopify: has("SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"),
  tiktok_posting: has("TIKTOK_ACCESS_TOKEN"),
  tiktok_ads: has("TIKTOK_ACCESS_TOKEN", "TIKTOK_ADVERTISER_ID"),
  meta_instagram: has("META_ACCESS_TOKEN", "META_IG_USER_ID"),
  meta_page: has("META_ACCESS_TOKEN", "META_PAGE_ID"),
  meta_ads: has("META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"),
  google_ads: has("GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"),
  higgsfield: has("HIGGSFIELD_API_KEY"),
  github_notifications: has("GITHUB_TOKEN") && !!process.env.GITHUB_REPOSITORY,
};

const live = Object.entries(integrations).filter(([, v]) => v).map(([k]) => k);
const degraded = Object.entries(integrations).filter(([, v]) => !v).map(([k]) => k);

writeJson("data/state/integrations.json", { updated: nowIso(), integrations, live, degraded });
console.log(`[doctor] live: ${live.join(", ") || "none"} · degraded: ${degraded.join(", ") || "none"}`);
