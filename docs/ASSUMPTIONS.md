# HerBody — Assumptions Register

Everything below is either **(A) taken from `data/config/product-facts.json` / `data/config/brand-voice.md`** (treated as true, single source), or **(B) assumed and marked TODO_VERIFY** (must be confirmed before the dependent surface goes live).

---

## 1. Product assumptions

**From product-facts.json (authoritative — never restate from memory):**

- One SKU: `HB-DAILY-300`, handle `the-daily-creatine-collagen`, 300g pouch, 14g scoop, 21 servings, Strawberry Lemonade, no added sugar.
- Prices: £39.99 one-time, £33.99 subscribe (15% off), £1.62/day on subscription (£33.99 ÷ 21), £1.90/day one-time.
- Formula v14 locked: Creapure® creatine 5000mg; Verisol® collagen 5000mg; myo/D-chiro inositol 40:1 500mg; dandelion root extract 250mg; hyaluronic acid 100mg; cranberry 36mg PAC; biotin 5000µg; L-methylfolate 400µg; B6 (P-5-P) 10mg; chromium 200µg; vitamin C 80mg; D3 25µg; A/E/K2 + full B-complex at 100% NRV. 13 actives total.
- Certifications (text claims only): Halal HMC protocol GB18/2026 (bovine collagen source-of-slaughter certified); GMP-certified UK facility; third-party batch tested with COA per lot. Example batch code format `HB-26·0417`.
- 30-day flavour guarantee ("hate it, we refund the pouch"). Ships from London.
- Pledge: 20% of profits, audited annually; 2 charity tokens per pouch allocated by the customer in the app.
- Onboarding: half scoop (7g) days 1–7, full scoop day 8+.

**TODO_VERIFY (product):**

- [ ] **Zinc**: `brand-voice.md` lists zinc hair/skin claims as a safe pattern, but zinc is **not listed** in `formula_locked_v14`. Zinc claims are **embargoed** until the spec sheet confirms zinc at ≥15% NRV per scoop. (See `docs/CLAIMS_MATRIX.md` row 6.)
- [ ] "The math" separate-buy prices (creatine £20, Verisol £35, etc., total £130) are marked "verify prices before publishing" in the JSON — must be re-checked against live UK retail before the comparison table publishes.
- [ ] Halal certificate PDF physically on file and current before the halal badge goes live.
- [ ] First production lot COA on file before "third-party batch tested" appears on the live store.
- [ ] Exact NRV percentages for A, E, K2 and remaining B-complex (JSON says "100% NRV" collectively; the on-pack nutrition table needs per-nutrient figures from the manufacturer spec).

## 2. Shopify assumptions

- **No Shopify store exists yet.** All theme work targets a store to be created; `SHOPIFY_STORE_DOMAIN` is a placeholder throughout and must be replaced everywhere at store creation (grep for it).
- The **subscription selling plan (£33.99, 15% off, monthly) is created manually in the Shopify Subscriptions app UI**, not via API — see `docs/DECISIONS.md` D8. Theme code reads whatever selling plan exists; it does not create one.
- Shopify Payments will be approved for HerBody Ltd (UK entity) — TODO_VERIFY at store creation; fallback is PayPal-first launch.
- UK VAT: prices are VAT-inclusive as displayed (£39.99 / £33.99). Food supplements are standard-rated at 20% in the UK. TODO_VERIFY: HerBody Ltd VAT registration status (below-threshold launch is possible; if unregistered, no VAT invoices are issued and copy must not mention VAT receipts).
- Markets: **GB only** at launch. No international shipping rates configured.
- Theme is a custom build in `shopify/theme/` (Dawn-inspired architecture, no Dawn code copied — see `docs/OPEN_SOURCE_ATTRIBUTION.md`).

## 3. Tracking assumptions

- GA4 property, Meta Pixel + dataset, and TikTok Pixel do **not exist yet** — IDs are placeholders in `analytics/events.json` (`GA4_MEASUREMENT_ID`, `META_PIXEL_ID`, `TIKTOK_PIXEL_ID`). TODO_VERIFY at account creation.
- **Nothing fires before consent** (PECR + UK GDPR). Consent state is the gate for all pixels, including server-side CAPI/Events API events. See `analytics/TRACKING_PLAN.md` §6.
- Shopify Customer Events (web pixels) is the injection point on the storefront; the GitHub Pages brand site carries its own consent banner and the same gating.
- Server-side (Meta CAPI, TikTok Events API) is **phase 2** — planned and schema'd, not required for launch. Browser pixels with consent gating are sufficient to switch on paid traffic.
- Deduplication uses a shared `event_id` between browser and server events (see `analytics/TRACKING_PLAN.md` §5).

## 4. Compliance assumptions

- Regulatory frame is **UK only**: ASA/CAP Code, GB NHC register (retained Regulation (EC) 1924/2006 as it applies in GB), Food Supplements Regulations, Consumer Contracts Regulations 2013 (distance selling), DMCC Act 2024 (reviews, drip pricing, urgency), PECR + UK GDPR (consent). **No FDA/DSHEA/FTC language anywhere** — this is the key adaptation from the prior US build.
- The GB NHC register is checked **at draft time, per claim** — authorised wordings in `docs/CLAIMS_MATRIX.md` were compiled from the register as of July 2026; the pre-publish checklist requires a fresh register lookup because entries change.
- Botanical claims (dandelion, cranberry): no authorised GB claims exist; brand policy is traditional-use framing only, treated as **moderate residual risk** and kept off paid ads where practical.
- Zero customer reviews exist (`verification_flags.reviews_exist: false`). Anything resembling a review is a DMCC banned practice. Reviews stay disabled.
- Charity partners **not signed** (`charity_partners_signed: false`): only "vetted partners across eight causes" phrasing; no partner names anywhere until contracts are signed. TODO_VERIFY before the pact page names anyone.
- Founder is not public (`founder_public: false`): no founder name, face or story in copy until that flag flips.
- Pregnancy caution ("For healthy adults. Not suitable if pregnant or breastfeeding. Consult your GP if taking medication or managing a condition.") appears on the product page, FAQ, and every pack-shot-led ad where format allows.

## 5. Agent / automation assumptions

- **GitHub Actions is the only runtime** — no servers, no cloud functions (see `docs/DECISIONS.md` D1). Scheduled crons may drift ±15 minutes; nothing is time-critical enough to matter.
- Secrets (`ANTHROPIC_API_KEY`, platform tokens) live only in GitHub Actions secrets; `.env.example` documents names, never values.
- **Single-writer rule**: only agent workflows commit to `data/`; humans write only `data/approvals.json` (via the dashboard-generated commit or direct edit). Concurrency groups in workflows prevent racing commits.
- All agents are **draft-first**: output lands in `data/queue/{tiktok,social,ppc}/`; the publisher is the only workflow with platform write scopes and runs behind a GitHub **environment protection rule** requiring the founder's approval.
- Ad campaigns are created **PAUSED** with a hard **£25/day** total budget cap enforced in agent config; the PPC agent cannot raise it.
- Google Ads: **no API developer token yet** — the path is Ads Editor CSV export (`data/ppc-export/`) imported manually. TODO_VERIFY: basic-access token application after spend history exists.
- TikTok Content Posting API app is **unaudited** → API posts would be SELF_ONLY visibility; until audit passes, approved TikToks are posted manually from the queue.
- Anthropic API cost control: stable brand-voice prefix is prompt-cached; agents use structured outputs; daily token budget alarmed in the master brief.

## 6. Launch blockers (all must clear before first paid order)

1. Shopify store created, Shopify Payments (or fallback) live, test order refunded.
2. Legal pages published: T&Cs, privacy, cookies, returns/cancellation, shipping, subscription terms.
3. First lot COA + halal certificate on file; batch code recording live in fulfilment (see `operations/UK_FULFILLMENT_SOP.md`).
4. Consent banner verified: zero network calls to Google/Meta/TikTok before opt-in (see `analytics/pixel-qa-checklist.md`).
5. Claims audit passed: live store copy ⊆ `docs/CLAIMS_MATRIX.md` approved wording.
6. Support inbox live with macros loaded (see `operations/CUSTOMER_SUPPORT_SOP.md`).
7. Subscription selling plan created in Shopify Subscriptions app and test-subscribed.
8. `SHOPIFY_STORE_DOMAIN` placeholder replaced repo-wide; sitemap/robots point at the right domains.
9. Founder has run the morning routine end-to-end once (see `docs/MORNING_REVIEW_GUIDE.md`) including the emergency-pause drill.
10. Zinc question resolved (claim embargoed or formula confirmed).
