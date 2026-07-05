# HerBody — Full-Auto Setup Guide

This is the complete path from **zero → fully automatic**: Shopify store live, agents drafting daily, dashboards updating, and (once platform approvals land) auto-posting and ad-draft pushing. Every step ends with *"paste these secrets → run this workflow."*

**Where secrets go:** GitHub → `herbody-site` repo → **Settings → Secrets and variables → Actions → New repository secret**.

**The degradation ladder** — the system is useful at every tier:

| Tier | Secrets you have | What works |
|---|---|---|
| 0 | none | Site + dashboards on Pages; all docs, campaign YAML, Ads Editor CSVs in repo |
| 1 | `ANTHROPIC_API_KEY` | **The whole agent fleet**: daily TikTok/social/PPC drafts, content calendar, daily brief, weekly strategy — everything except live store data + auto-posting |
| 2 | + Shopify (3 secrets) | Store provisioned + theme deployed + real order metrics in the brief |
| 3 | + Meta / TikTok tokens | Approved posts auto-publish |
| 4 | + Google Ads API set | PPC drafts push as PAUSED campaigns via API (until then: CSV import, 5 minutes) |

---

## Step 1 — Anthropic API key (5 minutes, do this first)

1. Go to https://console.anthropic.com → **API Keys** → Create key.
2. Add secret: `ANTHROPIC_API_KEY`.
3. Test: **Actions → agent-fleet → Run workflow**. Within ~3 minutes you should see a new commit `fleet: daily run …` and drafts appearing at `…github.io/herbody-site/dash/approvals.html`.

Cost expectation: ~5 Sonnet calls/day with prompt caching ≈ pennies per day.

## Step 2 — Shopify store (about 1 hour, one-time)

1. **Create the store**: https://www.shopify.com/uk/free-trial → store name "herbody" (you'll get `something.myshopify.com`). Basic plan is fine.
2. **Custom app token** (for provisioning + metrics):
   - Admin → **Settings → Apps and sales channels → Develop apps → Create an app** → name `herbody-automation`.
   - Configuration → Admin API scopes: `write_products`, `read_products`, `write_content`, `read_content`, `write_publications`, `read_publications`, `read_orders`.
   - Install app → reveal **Admin API access token** (starts `shpat_`).
   - Secrets: `SHOPIFY_STORE_DOMAIN` = `yourstore.myshopify.com` (no https://), `SHOPIFY_ADMIN_TOKEN` = the token.
3. **Theme Access token** (for CI theme deploys):
   - Admin → Apps → search the App Store for **"Theme Access"** (by Shopify) → install → create password (starts `shptka_`) — it's emailed to you.
   - Secret: `SHOPIFY_CLI_THEME_TOKEN`.
4. **Provision the store**: Actions → **shopify-store-setup** → Run with `dry_run=true` first (read the log), then again with `dry_run=false`. Creates the product (No.01 The Daily, £39.99), pages and policies. Safe to re-run — it never duplicates.
5. **Deploy the theme**: Actions → **shopify-theme-deploy** → Run. It uploads as an unpublished theme "HerBody CI" — preview it in Admin → Themes, then either click Publish there or re-run the workflow with `publish_live=yes`.
6. **Subscribe & Save (2-minute manual step — deliberate)**: Admin → Apps → install **Shopify Subscriptions** (free, by Shopify) → create plan on The Daily: *Subscribe & Save 15%*, delivery every 3 weeks, price £33.99. (Why manual: API-created selling plans can't be managed from that app — one-time UI step avoids a whole class of billing bugs.)
7. Payments, shipping rates (UK free shipping), and your custom domain: normal Shopify Admin setup — see `docs/../operations/LAUNCH_OPERATIONS_CHECKLIST.md`.

## Step 3 — Approvals dashboard PAT (2 minutes)

The approval buttons on `dash/approvals.html` write to the repo from your browser.

1. https://github.com/settings/personal-access-tokens/new → Fine-grained.
2. Only select repositories → `herbody-site`. Permissions → **Contents: Read and write**. Expiry 90 days.
3. Paste it into the settings panel on the approvals page (stored only in your browser; "Forget token" wipes it). Rotate when it expires.

## Step 4 — Meta (Instagram + Facebook auto-posting) — days, incl. business verification

The path that does NOT require full Meta App Review (works for assets your own business owns):

1. **Business Manager**: https://business.facebook.com → create business → complete **business verification** (Settings → Security Centre; needs company details — this is the days-long part).
2. Connect your **Facebook Page** and **Instagram professional account** (IG must be Business, linked to the Page).
3. **App**: https://developers.facebook.com → Create app (Business type) → add products: none needed beyond Graph API.
4. **System user**: Business Settings → Users → System users → Add (Admin) → **Assign assets**: your Page (manage) + IG account.
5. **Generate token** for the system user with scopes: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `business_management` → choose "never expires".
6. IDs: `META_PAGE_ID` (Page → About), `META_IG_USER_ID` (Graph Explorer: `GET me/accounts` then `?fields=instagram_business_account`).
7. Secrets: `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID`. For ads later: `META_AD_ACCOUNT_ID` (numbers only).

Note: IG API posting requires a public image/video URL per post. Until you host media (e.g. Shopify Files), approved IG items resolve to **ready-manual** — copy-paste from the dashboard.

## Step 5 — TikTok (OmniFlash live posting) — budget 2–4 weeks for the audit

Reality check: TikTok's **Content Posting API** requires a developer app audit. **Unaudited apps can only create SELF_ONLY (private) posts.** The system is designed for this: OmniFlash drafts daily regardless; you post manually from the dashboard payloads until the audit clears.

1. **TikTok Business account** for @herbody (Settings → Account → switch to Business).
2. **Developer app**: https://developers.tiktok.com → register → Create app → add **Content Posting API** product → Login Kit with scope `video.publish`.
3. Do the OAuth once (the app's Login Kit flow with your brand account) → capture the access token + refresh token.
4. Submit for **app audit** (demo video + privacy policy URL — your Pages site works). Timeline: days–weeks.
5. Secret: `TIKTOK_ACCESS_TOKEN`. Pre-audit, API posts land as private (SELF_ONLY) — still useful as on-device previews.
6. For ads later: TikTok Ads Manager account → `TIKTOK_ADVERTISER_ID` + Business API access.

## Step 6 — Google Ads — days–weeks for the developer token; CSV works today

**Don't wait for the API.** Every fleet run writes `data/ppc-export/hb_uk_google_search_<date>.csv` — import via the free **Google Ads Editor** app (Account → Import → from file), review, and the campaigns land **Paused**. 5 minutes, zero API.

For the API path (paused-draft pushes + spend metrics in the brief):
1. Google Ads account (create at https://ads.google.com — you'll get the Customer ID `xxx-xxx-xxxx`).
2. **Developer token**: requires a Google Ads **Manager (MCC)** account → API Centre → apply. New tokens start test-only; **Basic Access** application takes days–weeks.
3. **OAuth**: Google Cloud Console → project → enable Google Ads API → OAuth client (Desktop) → run the OAuth consent once for scope `https://www.googleapis.com/auth/adwords` → capture the **refresh token** (easiest via Google's OAuth Playground with your own client credentials).
4. Secrets: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`.
5. Also set up **GA4** + link Google Ads; put the measurement ID in the theme settings (`ga4_id`) — pixels only fire after cookie consent.

## Step 7 — Klaviyo (email/SMS) — 30 minutes

1. https://www.klaviyo.com → free tier → connect the Shopify store (official integration, 2 clicks).
2. Build the flows from `marketing/KLAVIYO_FLOWS.md` (copy is pre-written; Welcome flow first — it delivers the First-7-Days lead magnet the theme's email capture promises).
3. Secrets (optional, only if agents should read email metrics later): `KLAVIYO_PUBLIC_KEY`, `KLAVIYO_PRIVATE_KEY`.

## Step 8 — Arm the ads gate (only when you're ready to spend)

Live ad pushes are triple-locked; all three must be true:
1. Repo **Settings → Environments → New environment `ads-production`** → add yourself as **required reviewer**.
2. Copy `approvals/ADS_LAUNCH_APPROVAL.example.json` → `approvals/ADS_LAUNCH_APPROVAL.json`, fill it in honestly, commit it.
3. Run **ppc-push** and approve the environment gate when prompted. Everything still lands **PAUSED** — you flip campaigns live inside the ad platforms yourself.

Kill switch, any time: pause campaigns in the platform UIs → delete the platform secrets → disable `agent-fleet` / `publish-approved` in the Actions tab (… menu → Disable workflow). Details: `docs/MORNING_REVIEW_GUIDE.md`.

---

## Daily rhythm once running

06:00-ish UK: fleet runs → **read the brief** at `/dash/` (3 min) → **approve/reject drafts** at `/dash/approvals.html` (5 min) → approved items publish on the next 2-hourly run (or hit "Publish now") → film the day's TikTok from the OmniFlash script. Monday adds the weekly strategy review. That's the whole job.

## Secrets reference

| Secret | Used by | Tier |
|---|---|---|
| `ANTHROPIC_API_KEY` | agent-fleet, weekly-strategy | 1 — required |
| `SHOPIFY_STORE_DOMAIN` `SHOPIFY_ADMIN_TOKEN` | store-setup, fleet metrics | 2 |
| `SHOPIFY_CLI_THEME_TOKEN` | theme-deploy | 2 |
| `META_ACCESS_TOKEN` `META_PAGE_ID` `META_IG_USER_ID` | publish-approved | 3 |
| `TIKTOK_ACCESS_TOKEN` | publish-approved | 3 |
| `META_AD_ACCOUNT_ID` `TIKTOK_ADVERTISER_ID` | fleet metrics, ppc-push | 4 |
| `GOOGLE_ADS_DEVELOPER_TOKEN` `GOOGLE_ADS_CLIENT_ID` `GOOGLE_ADS_CLIENT_SECRET` `GOOGLE_ADS_REFRESH_TOKEN` `GOOGLE_ADS_CUSTOMER_ID` | fleet metrics, ppc-push | 4 |
| `KLAVIYO_PUBLIC_KEY` `KLAVIYO_PRIVATE_KEY` | future email metrics | optional |
