# HerBody — Tracking Plan

Scope: Shopify storefront (primary conversion surface), GitHub Pages brand site (pre-store + landing surface), and server-side phase 2. Machine-readable schema: `analytics/events.json`. UTM rules: `analytics/utm-taxonomy.md`. QA: `analytics/pixel-qa-checklist.md`.

**Governing rule (non-negotiable): no marketing or analytics tag fires before opt-in consent.** See §6.

---

## 1. GA4 — source of truth for measurement

Property: HerBody UK (ID placeholder `GA4_MEASUREMENT_ID` — created at store setup, see `docs/ASSUMPTIONS.md` §3). Currency GBP. Standard ecommerce schema so Shopify, ads platforms and reports agree.

| Event | Fires when | Key parameters |
|---|---|---|
| `view_item` | Product page (`/products/the-daily-creatine-collagen`) rendered | `currency: "GBP"`, `value: 39.99` (or selected plan price), `items[]` (see §4) |
| `add_to_cart` | Add-to-cart / Subscribe-selected add | `currency`, `value`, `items[]` incl. `item_variant` = `one-time` \| `subscribe` |
| `begin_checkout` | Checkout entered | `currency`, `value`, `items[]`, `coupon` |
| `purchase` | Shopify order complete (checkout thank-you via Customer Events) | `transaction_id` (Shopify order ID — dedup key), `value`, `tax`, `shipping`, `currency`, `items[]` |
| `sign_up` | Account creation or app-waitlist signup | `method: "shopify" \| "app_waitlist"` |
| `generate_lead` | Email capture (footer/pop-in, consented) | `lead_source: "footer" \| "welcome_offer" \| "quiz"` |

Plus automatically collected/enhanced-measurement events (page_view, scroll, outbound clicks) — left on, they respect the same consent gate.

**Item object (single SKU today):** `item_id: "HB-DAILY-300"`, `item_name: "No.01 The Daily"`, `item_brand: "HerBody"`, `item_category: "Supplements"`, `item_variant: "one-time" | "subscribe"`, `price: 39.99 | 33.99`, `quantity`.

## 2. Meta — Pixel now, CAPI phase 2

- **Browser Pixel** (`META_PIXEL_ID`): `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead`, `CompleteRegistration` mapped per `analytics/events.json`. `content_ids: ["HB-DAILY-300"]`, `content_type: "product"`, `value`, `currency: "GBP"`.
- **Conversions API (phase 2):** a GitHub Actions job (publisher-adjacent, read-only Shopify webhook export) sends `Purchase` server events with the **same `event_id`** as the browser event and `event_source_url`, `action_source: "website"`. Customer matching fields (hashed email) only for consented customers.
- **Dedup:** identical `event_name` + `event_id` browser/server → Meta keeps one. `event_id` = Shopify order ID for Purchase; UUID minted client-side and echoed to server for others (§5).
- Consent: Pixel script not loaded (not merely disabled) until consent; CAPI job checks the consent flag captured at order time before sending.

## 3. TikTok — Pixel now, Events API phase 2

- **Browser Pixel** (`TIKTOK_PIXEL_ID`): `ViewContent`, `AddToCart`, `InitiateCheckout`, `CompletePayment`, `Contact`/`SubmitForm` for leads — mapping in `analytics/events.json`.
- **Events API (phase 2):** server `CompletePayment` with matching `event_id` for dedup, same consent rule as Meta CAPI.
- Note: TikTok ads for supplements are policy-sensitive — creative goes through the same compliance gate as everything else; tracking itself is standard ecommerce.

## 4. Shopify Customer Events notes

- All storefront tags are injected via **Shopify Customer Events (web pixels)**, not theme-inline `<script>` where avoidable — checkout (including thank-you page) is only reachable this way on modern Shopify.
- The custom pixel subscribes to `page_viewed`, `product_viewed`, `product_added_to_cart`, `checkout_started`, `checkout_completed` and translates to GA4/Meta/TikTok per `analytics/events.json`.
- Shopify's consent API (`customerPrivacy`) is the gate inside Customer Events: tags initialise only after `analytics`/`marketing` consent is granted (see §6).
- The GitHub Pages brand site has no Shopify runtime: it carries its own lightweight consent banner and loads the same three tags post-consent only. Cross-domain: outbound links to the store carry UTMs (`analytics/utm-taxonomy.md`); GA4 cross-domain linking configured between the Pages domain and the Shopify domain.

## 5. Browser/server deduplication (phase 2 design, decided now)

1. Browser mints `event_id`: for `purchase`/`CompletePayment` it is the **Shopify order ID**; for other events a UUIDv4 stored on the event payload.
2. Server-side senders reuse the same ID (`event_id` for Meta, `event_id` for TikTok, `transaction_id` for GA4 Measurement Protocol if ever used).
3. Rule of thumb: **browser event is primary**, server event is redundancy for signal loss — never send server-only events for actions that also have a browser tag, without the shared ID.
4. GA4: no double-fire risk at launch (browser only). If Measurement Protocol lands later, `transaction_id` dedup covers purchase only — other MP events must be additive-only by design.

## 6. UK consent mode — nothing fires before consent

- **Legal basis:** PECR (consent for non-essential storage/access) + UK GDPR. ICO position: reject must be as easy as accept; analytics cookies are not "strictly necessary".
- **Implementation:**
  - Default state: **no GA4, Meta, TikTok, Klaviyo scripts loaded at all** pre-consent. Not "consent mode denied pings" — *zero third-party marketing requests* (strictest reading; also why fonts are self-hosted).
  - Google Consent Mode v2 signals (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`) set to `denied` by default and updated to `granted` on accept — then GA4/ads tags load.
  - Banner: equal-prominence Accept / Reject, granular toggle (analytics vs marketing), no cookie wall, choice persisted 6 months, re-openable from footer ("Cookie preferences").
  - Shopify side: Shopify's Customer Privacy consent state is the single source; the Customer Events pixel checks it before initialising any vendor.
  - Server-side (phase 2): consent captured at order time is stored with the order attribute; CAPI/Events API jobs skip non-consented orders.
- **Consequence accepted:** we under-report vs. reality. The dashboards annotate paid-channel figures as "consented traffic only".

## 7. Naming & change control

- UTMs: `HB_UK_*` taxonomy is mandatory on every non-organic link — `analytics/utm-taxonomy.md`.
- New events or parameter changes require a PR touching `analytics/events.json` + this plan together; the metrics agent validates incoming data against `events.json` and flags unknown events in the daily brief.
