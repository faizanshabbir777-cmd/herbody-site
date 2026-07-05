# HerBody — Launch Operations Checklist

Everything that must be TRUE before the first paid order is possible (i.e. before password removal AND before any ad campaign is enabled). Owner: founder. Each section has a hard gate — an unticked box in a gated section blocks launch, full stop. Cross-references: `docs/ASSUMPTIONS.md` §6 (blockers), `docs/COMPLIANCE_CHECKLIST.md` (per-surface), `analytics/pixel-qa-checklist.md`.

## 1. Store live ⛔ gate

- [ ] Shopify store created; `SHOPIFY_STORE_DOMAIN` placeholder replaced repo-wide (grep returns zero hits) — domain connected, SSL active.
- [ ] Theme deployed from `shopify/theme/`; all templates render (home, product, science, pact, app, faq, tiktok landing, policies, 404).
- [ ] Product `HB-DAILY-300` live: title, price **£39.99**, images with alt text per `seo/SCHEMA_PLAN.md` §6, full ingredient/dose panel matching `product-facts.json` exactly, food-supplement statement + pregnancy caution visible without interaction.
- [ ] **Subscription selling plan created in the Shopify Subscriptions app UI** (monthly, 15% → **£33.99**) and attached to the product; "from £1.62 a day" renders correctly (Decision D8).
- [ ] Reviews: no review app installed, no rating UI anywhere, no `aggregateRating` in source (Decision D6).
- [ ] Inventory set to actual on-hand stock; oversell protection on.
- [ ] Test order + subscription test order placed via Shopify test mode and **refunded** end-to-end (proves `operations/RETURNS_SOP.md` §C works).

## 2. Payments ⛔ gate

- [ ] Shopify Payments approved for HerBody Ltd (or documented fallback live); payout bank account verified; first test payout confirmed scheduled.
- [ ] VAT position decided and configured (registered → prices entered as VAT-inclusive with correct tax settings; not yet registered → no VAT invoice promises anywhere in copy). `docs/ASSUMPTIONS.md` §2.
- [ ] Fraud settings reviewed; high-risk hold process understood (`operations/UK_FULFILLMENT_SOP.md` §6).
- [ ] Statement descriptor reads HERBODY (so bank statements don't trigger disputes).

## 3. Legal pages ⛔ gate

- [ ] T&Cs: HerBody Ltd identity + registered address, contact email, delivery commitment, subscription terms, governing law (England & Wales).
- [ ] Refund/returns policy: 14-day statutory + 30-day flavour guarantee side by side, model cancellation form, postage responsibilities, timelines (`operations/RETURNS_SOP.md` §E).
- [ ] Privacy policy (UK GDPR: lawful bases, vendors, rights, retention) + cookie policy matching the actual consent banner behaviour.
- [ ] Shipping policy with real configured rates.
- [ ] Subscription terms page: price, frequency, reminder emails, two-click online cancellation.
- [ ] All policy pages linked in footer and in checkout.

## 4. Shipping rates ⛔ gate

- [ ] Royal Mail Click & Drop connected; Tracked 48 + Tracked 24 rates configured and test-quoted at checkout.
- [ ] Free-shipping rule (if any) decided; `docs/COPY_BANK.md` §6 TODO_VERIFY line resolved — copy matches configured reality.
- [ ] Packaging stock on hand ≥ launch inventory; insert card printed (with QR UTM, cautions, ritual steps).
- [ ] Dispatch-note template shows batch code line.

## 5. Product compliance & quality ⛔ gate

- [ ] **First production lot COA on file**; batch log started (batch code, quantity, best-before, COA ref) per `operations/UK_FULFILLMENT_SOP.md` §2.
- [ ] **HMC halal certificate (GB18/2026) PDF on file** and current — halal badge stays hidden until this box ticks.
- [ ] Pack artwork carries: full ingredient list with doses, NRVs, stated dose + do-not-exceed, food-supplement statement, pregnancy caution, keep-away-from-children, batch + best-before stamping confirmed on physical stock.
- [ ] Food business registration with the local authority completed (required for food supplement sellers) — TODO_VERIFY registration confirmation on file.
- [ ] Live site copy audit passed: every claim maps to `docs/CLAIMS_MATRIX.md`; zero hits for `docs/REJECTED_CLAIMS.md` items; zinc claims absent (embargo).
- [ ] "The math" module hidden unless retail price check is dated within 3 months.

## 6. Support ⛔ gate

- [ ] `hello@` inbox live, signature set, all 10 macros from `operations/CUSTOMER_SUPPORT_SOP.md` loaded; COA + halal cert PDFs saved as ready attachments.
- [ ] Contact page live; DM auto-reply pointing order queries to email.
- [ ] Founder has dry-run M4 (pregnancy) and M6 (guarantee) replies once each.

## 7. Pixels + consent ⛔ gate

- [ ] GA4 property, Meta Pixel, TikTok Pixel created; real IDs substituted in theme/Customer Events (no `*_ID` placeholders in deployed code).
- [ ] **Full `analytics/pixel-qa-checklist.md` run PASSED** — including section A (zero pre-consent vendor requests) on both the store and the Pages site. Logged in `data/state/pixel-qa-log.json`.
- [ ] Consent banner reject path re-tested on mobile.
- [ ] GA4 marked GBP, UK timezone; internal traffic (founder IP) filtered.

## 8. Fleet readiness (can trail launch by days — but must precede first ad enable)

- [ ] All agent workflows dry-run green; drafts land in `data/queue/`, nothing published, `data/approvals.json` untouched by agents.
- [ ] Publisher environment protection verified: run halts for founder approval; freeze flag tested.
- [ ] £25/day cap constant confirmed in agent config; all drafted campaigns confirm PAUSED status on-platform after import.
- [ ] Google Ads account created; Ads Editor installed; one CSV from `data/ppc-export/` imported as a rehearsal (campaign arrives paused, then deleted).
- [ ] Founder has completed one full morning routine + the emergency-pause drill (`docs/MORNING_REVIEW_GUIDE.md`).

## 9. Final go/no-go

- [ ] Sections 1–7 fully ticked (8 may trail for organic-only launch; required before paid).
- [ ] `docs/ASSUMPTIONS.md` §6 blockers all cleared or explicitly accepted in writing by the founder.
- [ ] Password page removed. First real order placed by a friendly tester at full price and fulfilled through the complete SOP within the promised window.
- [ ] Date, time and store URL recorded in the repo README. Then — and only then — consider enabling the first campaign at ≤ £10/day within the £25 cap.
