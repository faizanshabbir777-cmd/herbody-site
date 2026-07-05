# HerBody — Pixel & Consent QA Checklist

Run before launch, after any theme/pixel change, and monthly. Tools: browser DevTools (Network + Application tabs), GA4 DebugView, Meta Events Manager Test Events, TikTok Pixel Helper. Record results (date, tester, pass/fail per section) in `data/state/pixel-qa-log.json`.

## A. Pre-consent state (the one that keeps us legal — PECR)

Fresh profile / cleared storage, load the brand site AND the Shopify storefront:

- [ ] Network tab shows **zero** requests to: `google-analytics.com`, `googletagmanager.com`, `analytics.google.com`, `connect.facebook.net`, `facebook.com/tr`, `analytics.tiktok.com`, `klaviyo.com` before any banner interaction.
- [ ] No cookies or localStorage entries from those vendors pre-consent (Application tab: only first-party essentials + Shopify's own essential cookies).
- [ ] Consent banner renders on first paint; **Reject** is one click, same prominence as Accept; granular toggles (analytics / marketing) available.
- [ ] After **Reject**: browse product → add to cart → begin checkout; network stays clean of all vendors above for the whole session.
- [ ] Choice persists across pages and a return visit; "Cookie preferences" link in footer reopens the banner.
- [ ] Self-hosted fonts confirmed: no `fonts.googleapis.com` / `fonts.gstatic.com` requests ever.

## B. Post-consent firing (accuracy)

Accept all, then walk the funnel with GA4 DebugView + Meta Test Events + TikTok Pixel Helper open:

- [ ] Home → `page_view` (GA4), `PageView` (Meta), `Pageview` (TikTok) — once each, no doubles.
- [ ] Product page → `view_item` / `ViewContent` / `ViewContent` with `item_id`/`content_id` = `HB-DAILY-300`, `currency=GBP`, `value=39.99`.
- [ ] Toggle subscribe → GA4 `select_item` fires; re-check `add_to_cart` value flips to `33.99` with `item_variant=subscribe`.
- [ ] Add to cart → all three platforms, correct value/variant.
- [ ] Begin checkout → `begin_checkout` / `InitiateCheckout` / `InitiateCheckout`.
- [ ] **Test purchase** (Shopify test mode / Bogus Gateway) → `purchase` with `transaction_id` = order ID; `Purchase` (Meta) and `CompletePayment` (TikTok) carry the same value and an `event_id` equal to the order ID; tax/shipping populated in GA4.
- [ ] Refresh the thank-you page → **no duplicate purchase event** on any platform.
- [ ] Email capture → `generate_lead` / `Lead` / `SubmitForm`; the email address itself appears in **no** analytics payload (inspect the actual request bodies).
- [ ] Granular check: accept analytics only → GA4 fires, Meta/TikTok stay silent.

## C. UTM & attribution

- [ ] Land via example UTM #1 from `analytics/utm-taxonomy.md` → GA4 real-time shows source/medium/campaign exactly as sent (no stripping by redirects).
- [ ] Cross-domain: click brand site → Shopify store; GA4 session survives (`_gl` linker param present, no self-referral).
- [ ] Internal links carry no UTMs.

## D. Consent Mode & data hygiene

- [ ] Google Consent Mode v2 defaults are `denied` (check `dataLayer` / gtag state pre-consent) and update on accept.
- [ ] No `aggregateRating`, review or star-rating markup anywhere (belt-and-braces DMCC sweep — view source on all templates).
- [ ] `analytics/events.json` version matches what the pixels implement (metrics agent cross-check green in last daily brief).
- [ ] Checkout thank-you tags run via Shopify Customer Events (not legacy `checkout.liquid` / additional-scripts).

## E. Failure protocol

Any A-section failure = **stop paid traffic immediately** (consent breach), fix, re-run full checklist. B/C failures = fix before next "Publish now"; paid may continue only if purchase tracking is intact on at least GA4.
