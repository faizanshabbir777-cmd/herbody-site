// Platform API wrappers. Every wrapper is availability-checked: if its secrets are
// absent it returns { available: false } instead of throwing, so agents degrade to
// draft mode. NEVER log tokens or full API responses containing PII.
const env = (k) => process.env[k]?.trim() || null;

function audit(platform, action, ok, note = "") {
  // audit log to stdout only — Actions transcript is the audit trail; no secrets.
  console.log(`[audit] ${new Date().toISOString()} ${platform} ${action} ${ok ? "OK" : "FAIL"} ${note}`);
}

async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
  if (!res.ok) {
    const msg = body?.error?.message || body?.errors?.[0]?.message || body?.message || res.statusText;
    throw new Error(`${res.status} ${String(msg).slice(0, 300)}`);
  }
  return body;
}

// ---------- Shopify (Admin GraphQL) ----------
export const shopify = {
  get available() { return !!(env("SHOPIFY_STORE_DOMAIN") && env("SHOPIFY_ADMIN_TOKEN")); },
  async gql(query, variables = {}) {
    if (!this.available) return { available: false };
    const v = env("SHOPIFY_API_VERSION") || "2025-07";
    const body = await jfetch(
      `https://${env("SHOPIFY_STORE_DOMAIN")}/admin/api/${v}/graphql.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": env("SHOPIFY_ADMIN_TOKEN") },
        body: JSON.stringify({ query, variables }),
      }
    );
    if (body.errors?.length) throw new Error(body.errors[0].message);
    return { available: true, data: body.data };
  },
  /**
   * Host a generated media URL on Shopify Files (public CDN) so TikTok/IG APIs can
   * pull it. fileCreate accepts an external originalSource URL — no bytes touch the
   * repo. Returns { available, id, url|pending } — CDN URL may lag while Shopify
   * processes the file; callers keep the provider URL as fallback.
   */
  async hostMediaFromUrl(sourceUrl, { alt = "", contentType = "IMAGE" } = {}) {
    if (!this.available) {
      const base = env("MEDIA_CDN_BASE_URL");
      return base
        ? { available: false, manual: true, note: `upload manually to ${base} and paste the URL into the queue item` }
        : { available: false };
    }
    const m = `mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){ files{ id fileStatus preview{ image{ url } } } userErrors{ message } } }`;
    const r = await this.gql(m, {
      files: [{ originalSource: sourceUrl, alt, contentType }],
    });
    const errs = r.data?.fileCreate?.userErrors || [];
    if (errs.length) throw new Error(errs[0].message);
    const f = r.data?.fileCreate?.files?.[0];
    audit("shopify", "hostMediaFromUrl", true, f?.id || "");
    return {
      available: true,
      id: f?.id || null,
      url: f?.preview?.image?.url || null,
      pending: f?.fileStatus !== "READY",
    };
  },
  /** Yesterday+today order rollup for metrics. */
  async orderStats() {
    if (!this.available) return { available: false };
    const q = `query($q:String!){ orders(first: 100, query:$q){ nodes{ createdAt currentTotalPriceSet{shopMoney{amount}} } } }`;
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const r = await this.gql(q, { q: `created_at:>=${since}` });
    const nodes = r.data?.orders?.nodes || [];
    const revenue = nodes.reduce((s, o) => s + parseFloat(o.currentTotalPriceSet?.shopMoney?.amount || 0), 0);
    audit("shopify", "orderStats", true, `${nodes.length} orders/7d`);
    return { available: true, orders_7d: nodes.length, revenue_gbp_7d: Math.round(revenue * 100) / 100 };
  },
};

// ---------- TikTok ----------
export const tiktok = {
  get postingAvailable() { return !!env("TIKTOK_ACCESS_TOKEN"); },
  get adsAvailable() { return !!(env("TIKTOK_ACCESS_TOKEN") && env("TIKTOK_ADVERTISER_ID")); },
  /**
   * Content Posting API — text/photo/video init. NOTE: unaudited developer apps can
   * only create SELF_ONLY (private) posts. We post as draft/inbox where possible so
   * the owner finishes in-app. Video upload requires a public video URL or chunked
   * upload; we support PULL_FROM_URL when payload.video_url exists.
   */
  async post(payload) {
    if (!this.postingAvailable) return { available: false };
    if (!payload.video_url) {
      // No media in repo by design — without a hosted video URL we cannot API-post.
      return { available: true, skipped: true, reason: "no video_url in payload — manual post required" };
    }
    const body = await jfetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("TIKTOK_ACCESS_TOKEN")}` },
      body: JSON.stringify({
        post_info: {
          title: String(payload.caption || "").slice(0, 2200),
          privacy_level: "SELF_ONLY", // pre-audit ceiling; raise after TikTok app audit
          disable_comment: false,
        },
        source_info: { source: "PULL_FROM_URL", video_url: payload.video_url },
      }),
    });
    audit("tiktok", "post.init", true, body?.data?.publish_id || "");
    return { available: true, id: body?.data?.publish_id, mode: "SELF_ONLY" };
  },
  /** Organic video metrics (Display API /v2/video/list/). Read-only; degrades gracefully. */
  async organicVideoMetrics() {
    if (!this.postingAvailable) return { available: false };
    const body = await jfetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,view_count,like_count,comment_count,share_count",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("TIKTOK_ACCESS_TOKEN")}` },
        body: JSON.stringify({ max_count: 20 }),
      }
    );
    const videos = body?.data?.videos || [];
    audit("tiktok", "organicVideoMetrics", true, `${videos.length} videos`);
    return {
      available: true,
      rows: videos.map((v) => ({
        post_id: String(v.id),
        platform: "tiktok",
        title: v.title || "",
        published_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
        views: v.view_count || 0,
        impressions: v.view_count || 0,
        likes: v.like_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0,
      })),
    };
  },
  async adInsights() {
    if (!this.adsAvailable) return { available: false };
    const u = new URL("https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/");
    u.search = new URLSearchParams({
      advertiser_id: env("TIKTOK_ADVERTISER_ID"),
      report_type: "BASIC", dimensions: JSON.stringify(["campaign_id"]),
      data_level: "AUCTION_CAMPAIGN",
      metrics: JSON.stringify(["spend", "impressions", "clicks", "conversion"]),
      start_date: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      page_size: "50",
    }).toString();
    const body = await jfetch(u, { headers: { "Access-Token": env("TIKTOK_ACCESS_TOKEN") } });
    audit("tiktok", "adInsights", true);
    return { available: true, rows: body?.data?.list || [] };
  },
};

// ---------- Meta (Instagram/Facebook) ----------
const META_V = "v21.0";
export const meta = {
  get igAvailable() { return !!(env("META_ACCESS_TOKEN") && env("META_IG_USER_ID")); },
  get pageAvailable() { return !!(env("META_ACCESS_TOKEN") && env("META_PAGE_ID")); },
  get adsAvailable() { return !!(env("META_ACCESS_TOKEN") && env("META_AD_ACCOUNT_ID")); },
  /** IG image/reel publish needs a public media URL; caption-only is not supported → manual. */
  async igPublish(payload) {
    if (!this.igAvailable) return { available: false };
    if (!payload.image_url && !payload.video_url) {
      return { available: true, skipped: true, reason: "no media url — manual post required" };
    }
    const base = `https://graph.facebook.com/${META_V}/${env("META_IG_USER_ID")}`;
    const params = new URLSearchParams({ access_token: env("META_ACCESS_TOKEN"), caption: payload.caption || "" });
    if (payload.video_url) { params.set("media_type", "REELS"); params.set("video_url", payload.video_url); }
    else params.set("image_url", payload.image_url);
    const c = await jfetch(`${base}/media`, { method: "POST", body: params });
    const p = await jfetch(`${base}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ access_token: env("META_ACCESS_TOKEN"), creation_id: c.id }),
    });
    audit("meta", "igPublish", true, p.id);
    return { available: true, id: p.id };
  },
  async pagePost(payload) {
    if (!this.pageAvailable) return { available: false };
    const body = await jfetch(`https://graph.facebook.com/${META_V}/${env("META_PAGE_ID")}/feed`, {
      method: "POST",
      body: new URLSearchParams({
        access_token: env("META_ACCESS_TOKEN"),
        message: payload.caption || payload.text || "",
        ...(payload.link ? { link: payload.link } : {}),
      }),
    });
    audit("meta", "pagePost", true, body.id);
    return { available: true, id: body.id };
  },
  /** Organic IG media metrics (Graph API). Read-only; degrades gracefully. */
  async igMediaMetrics() {
    if (!this.igAvailable) return { available: false };
    const u = `https://graph.facebook.com/${META_V}/${env("META_IG_USER_ID")}/media?` +
      new URLSearchParams({
        access_token: env("META_ACCESS_TOKEN"),
        fields: "id,caption,media_type,like_count,comments_count,timestamp,permalink",
        limit: "20",
      });
    const body = await jfetch(u);
    const rows = (body?.data || []).map((m) => ({
      post_id: String(m.id),
      platform: "instagram",
      title: String(m.caption || "").slice(0, 80),
      published_at: m.timestamp || null,
      likes: m.like_count || 0,
      comments: m.comments_count || 0,
      media_type: m.media_type || "",
      permalink: m.permalink || "",
    }));
    audit("meta", "igMediaMetrics", true, `${rows.length} media`);
    return { available: true, rows };
  },
  async adInsights() {
    if (!this.adsAvailable) return { available: false };
    const u = `https://graph.facebook.com/${META_V}/act_${env("META_AD_ACCOUNT_ID").replace(/^act_/, "")}/insights?` +
      new URLSearchParams({
        access_token: env("META_ACCESS_TOKEN"),
        date_preset: "last_7d", level: "campaign",
        fields: "campaign_name,spend,impressions,clicks,actions",
      });
    const body = await jfetch(u);
    audit("meta", "adInsights", true);
    return { available: true, rows: body?.data || [] };
  },
};

// ---------- Google Ads ----------
export const gads = {
  get available() {
    return !!(env("GOOGLE_ADS_DEVELOPER_TOKEN") && env("GOOGLE_ADS_CLIENT_ID") &&
      env("GOOGLE_ADS_CLIENT_SECRET") && env("GOOGLE_ADS_REFRESH_TOKEN") && env("GOOGLE_ADS_CUSTOMER_ID"));
  },
  async accessToken() {
    const body = await jfetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: env("GOOGLE_ADS_CLIENT_ID"),
        client_secret: env("GOOGLE_ADS_CLIENT_SECRET"),
        refresh_token: env("GOOGLE_ADS_REFRESH_TOKEN"),
        grant_type: "refresh_token",
      }),
    });
    return body.access_token;
  },
  async search(gaql) {
    if (!this.available) return { available: false };
    const token = await this.accessToken();
    const cid = env("GOOGLE_ADS_CUSTOMER_ID").replace(/-/g, "");
    const body = await jfetch(
      `https://googleads.googleapis.com/v18/customers/${cid}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: gaql }),
      }
    );
    audit("gads", "search", true);
    return { available: true, results: (Array.isArray(body) ? body : [body]).flatMap((b) => b.results || []) };
  },
};
