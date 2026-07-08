// UTM discipline — one builder for every URL/campaign name the fleet emits.
// Prefix comes from data/config/product-assets.json → utm_prefix (default hb_uk),
// per analytics/utm-taxonomy.md: lowercase utm values, campaign names mirror UTMs.

/** Lowercase utm campaign token: hb_uk_<channel>_<name>_v<N>. */
export function utmCampaign({ prefix = "hb_uk", channel = "tiktok", name = "x", version = 1 } = {}) {
  const clean = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${clean(prefix)}_${clean(channel)}_${clean(name)}_v${version}`;
}

/** Full utm query string. */
export function buildUtm({ prefix = "hb_uk", source = "tiktok", medium = "organic", name = "x", content = "", version = 1 } = {}) {
  const params = new URLSearchParams({
    utm_source: source.toLowerCase(),
    utm_medium: medium.toLowerCase(),
    utm_campaign: utmCampaign({ prefix, channel: source, name, version }),
  });
  if (content) params.set("utm_content", String(content).toLowerCase());
  return params.toString();
}

/** UPPERCASE campaign-name prefix mirroring the utm prefix (HB_UK_...). */
export function campaignPrefix(spec) {
  return String(spec?.utm_prefix || "hb_uk").toUpperCase();
}

/**
 * Suffix the utm_content token with an A/B variant letter:
 * "…utm_content=vid_x01…" + "a" → "…utm_content=vid_x01-a…".
 * Works on full query strings or bare utm_content values.
 */
export function withVariantSuffix(utm = "", letter = "a") {
  const s = String(utm);
  if (/utm_content=/.test(s)) {
    return s.replace(/(utm_content=)([^&\s]+)/, (_, k, v) => `${k}${v}-${letter}`);
  }
  return s ? `${s}-${letter}` : s;
}
