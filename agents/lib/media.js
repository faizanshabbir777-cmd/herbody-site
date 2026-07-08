// Media hygiene — hosting + URL allowlisting for anything the fleet hands to a
// posting API. Provider URLs can expire; Shopify Files gives a stable public CDN
// URL. The allowlist stops a misbehaving provider response from making the
// publisher pull media from an arbitrary host.
import { shopify } from "./platforms.js";

const env = (k) => process.env[k]?.trim() || null;

/** Hosts always trusted for publish-time media pulls. */
export const DEFAULT_ALLOWED_HOSTS = ["cdn.shopify.com"];

/**
 * Is this media URL from an allowed host?
 * Allowlist = DEFAULT_ALLOWED_HOSTS + MEDIA_URL_ALLOWED_HOSTS (csv env).
 * An empty/unset env var means: shopify CDN + provider host recorded at
 * generation time are fine — callers pass extraHosts for that.
 */
export function mediaHostAllowed(url, { allowlistCsv = env("MEDIA_URL_ALLOWED_HOSTS"), extraHosts = [] } = {}) {
  if (!url) return { ok: false, reason: "no media url" };
  let host;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return { ok: false, reason: `non-https media url (${u.protocol})` };
    host = u.hostname.toLowerCase();
  } catch {
    return { ok: false, reason: "unparseable media url" };
  }
  const allowed = [
    ...DEFAULT_ALLOWED_HOSTS,
    ...(allowlistCsv ? allowlistCsv.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean) : []),
    ...extraHosts.map((h) => String(h).toLowerCase()),
  ];
  const ok = allowed.some((a) => host === a || host.endsWith(`.${a}`));
  return ok
    ? { ok: true, reason: "host allowed" }
    : { ok: false, reason: `media host "${host}" not in allowlist (${allowed.join(", ")})` };
}

/** Record the provider host of a generated media URL so the publisher can trust it. */
export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

/**
 * Re-host a (possibly expiring) provider media URL on Shopify Files.
 * Returns { hosted_url, hosted_file_id, hosted_pending } — hosted_url may be
 * null while Shopify processes the file; collect-pending re-checks it.
 * Degrades to a no-op when Shopify credentials are absent.
 */
export async function rehostMedia(sourceUrl, { alt = "", assetType = "video" } = {}) {
  try {
    const r = await shopify.hostMediaFromUrl(sourceUrl, {
      alt,
      contentType: assetType === "image" ? "IMAGE" : "VIDEO",
    });
    if (r.available === false) {
      return { hosted_url: null, hosted_file_id: null, hosted_pending: false, hosting_note: r.note || "Shopify not configured — using provider URL directly" };
    }
    return {
      hosted_url: r.url || null,
      hosted_file_id: r.id || null,
      hosted_pending: !!r.pending,
      hosting_note: r.pending ? "Shopify still processing — collect-pending will fill the CDN URL" : "hosted on Shopify Files",
    };
  } catch (e) {
    return { hosted_url: null, hosted_file_id: null, hosted_pending: false, hosting_note: `hosting failed: ${String(e.message).slice(0, 120)}` };
  }
}
