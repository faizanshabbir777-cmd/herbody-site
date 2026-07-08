// Creative-metrics join — pure helpers that map published queue items onto
// platform organic-metric rows. Extracted from metrics.js so the join logic is
// unit-testable without platform credentials.

/** Extract the utm_content token from a payload's utm string/field. */
export function utmContentOf(payload = {}) {
  const s = String(payload.utm_content || payload.utm || "");
  const m = s.match(/utm_content=([^&\s]+)/);
  return m ? m[1] : payload.utm_content || "";
}

const captionOf = (r = {}) => `${r.caption || ""} ${r.title || ""}`;

/**
 * Find the platform row for a published item. Priority:
 *  1. platform_post_id recorded by the publisher at post time (exact),
 *  2. utm_content token appearing in the platform caption/title,
 *  3. caption prefix overlap (manual posts pasted from the queue card).
 */
export function matchPlatformRow(publishedEntry = {}, payload = {}, platformRows = []) {
  const utmToken = utmContentOf(payload);
  const captionPrefix = String(payload.caption || "").slice(0, 40);
  return platformRows.find((r) => {
    if (r.platform !== publishedEntry.platform) return false;
    if (publishedEntry.platform_post_id && r.post_id === String(publishedEntry.platform_post_id)) return true;
    if (utmToken && captionOf(r).includes(utmToken)) return true;
    return !!(captionPrefix && captionOf(r).includes(captionPrefix));
  }) || null;
}

/** Assemble one normalized creative metric row from a published item (+ optional platform match). */
export function buildCreativeRow(publishedEntry = {}, fullRecord = {}, match = null) {
  const payload = fullRecord.payload || {};
  return {
    creative_id: publishedEntry.id,
    post_id: match?.post_id || publishedEntry.platform_post_id || null,
    platform: publishedEntry.platform,
    asset_type: payload.asset_type || (publishedEntry.agent === "image" ? "image" : "video"),
    hook: payload.hook || "",
    trend_basis: payload.trend_basis || "",
    trend_id: payload.trend_id || null,
    utm_content: utmContentOf(payload),
    published_at: publishedEntry.published_at,
    media_url: payload.video_url || payload.image_url || payload.media_url || null,
    product_spec_version: payload.product_spec_version || null,
    visual_qa_status: payload.visual_qa_status || null,
    compliance_status: fullRecord.compliance_status || payload.compliance_status || null,
    views: match?.views || 0,
    impressions: match?.impressions || match?.views || 0,
    likes: match?.likes || 0,
    comments: match?.comments || 0,
    shares: match?.shares || 0,
    saves: match?.saves || 0,
    matched: !!match,
  };
}
