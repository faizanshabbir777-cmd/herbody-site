# HerBody — Pre-Publish Compliance Checklist (UK)

Run this checklist **per surface** before anything goes live: store pages, ads, TikTok/social posts, emails, dashboard-approved queue items. The compliance gate agent runs it mechanically; the founder runs it by eye. A single ✗ blocks publish.

---

## 1. Claims — ASA/CAP + GB NHC register

- [ ] Every benefit sentence maps to a row in `docs/CLAIMS_MATRIX.md`. Anything unmapped → reject.
- [ ] **Fresh GB NHC register lookup performed** for each authorised claim used (register: search "nutrition and health claims register" on GOV.UK — entries can be amended/withdrawn). Record the lookup date in the draft's metadata (`register_checked: YYYY-MM-DD`).
- [ ] Conditions of use met and evidenced from `product-facts.json` (creatine ≥3g/day → we have 5g ✔; vitamins ≥15% NRV per daily dose ✔ for C, D3, B6, folate, biotin, chromium).
- [ ] Reworded claims are **no stronger** than register wording; verbatim parent claim present on the landing page.
- [ ] Nothing from `docs/REJECTED_CLAIMS.md` present, including paraphrases.
- [ ] General wellbeing phrases ("feel like yourself") are accompanied by a specific authorised claim on the same surface.
- [ ] Botanical copy (dandelion, cranberry) is traditional-use framed, and absent from paid ads.
- [ ] Inositol copy: informational surfaces only, "studied in PCOS research" ceiling, never adjacent to B6 hormonal-activity claim.
- [ ] No zinc claims (embargoed — `docs/ASSUMPTIONS.md` §1).

## 2. Mandatory statements & placement

- [ ] **Food supplement statement** present where the format requires it (product page, pack artwork, long-form email): "Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle." Visible without interaction on the product page (not buried in an accordion).
- [ ] **Pregnancy caution** present on product page, FAQ, and any ad landing page: "For healthy adults. Not suitable if pregnant or breastfeeding. Consult your GP if taking medication or managing a condition."
- [ ] Recommended daily dose stated (one 14g scoop; half scoop days 1–7) + "Do not exceed the stated dose" on pack/product page.
- [ ] "Keep out of reach of young children" on pack artwork (statutory for supplements).

## 3. Reviews & social proof — DMCC Act 2024

- [ ] Zero reviews, ratings, testimonials, star glyphs, "verified buyer", `aggregateRating` schema anywhere on the surface.
- [ ] UGC/creator content is identifiably creator/brand content — no first-person customer framing, no invented usage tenure.
- [ ] Paid partnerships labelled (#ad) per CAP recognisability rules.
- [ ] No fake urgency/scarcity mechanics (timers, stock counters, viewer counts).

## 4. Consent & privacy — PECR + UK GDPR

- [ ] **No marketing/analytics pixel fires before opt-in consent** — verified per `analytics/pixel-qa-checklist.md` (network tab clean of google/meta/tiktok calls pre-consent).
- [ ] Consent banner offers reject as prominently as accept; no consent walls, no pre-ticked boxes.
- [ ] Email capture is opt-in; marketing email only to consented addresses (soft opt-in only for actual customers, with unsubscribe in every send).
- [ ] Privacy and cookie policies published and linked in footer; policy lists actual vendors (GA4, Meta, TikTok, Klaviyo) once live.

## 5. Price coherence & transparency

- [ ] The three price facts agree everywhere they appear: **£39.99** one-time · **£33.99** subscribe (15% off) · **"from £1.62 a day"** (subscribe only; £33.99 ÷ 21). One-time per-day figure, if used, is **£1.90**.
- [ ] "From" present whenever £1.62/day is shown and one-time purchase is possible on that surface.
- [ ] Total price shown before checkout includes all mandatory costs; shipping cost or free-shipping threshold disclosed pre-checkout (DMCC drip-pricing rules).
- [ ] Subscription terms clear at the point of sign-up: monthly billing at £33.99, cancel any time, how to cancel — no subscription traps (DMCC).
- [ ] "The math" £130 comparison only if price-check dated within 3 months (Claims Matrix row 18).

## 6. Terms & distance-selling — Consumer Contracts Regulations 2013

- [ ] T&Cs complete: identity + geographic address of HerBody Ltd, contact email, total price incl. VAT treatment, delivery time commitment (within 30 days statutory default), complaints handling, governing law.
- [ ] **14-day statutory cancellation** right stated, with model cancellation form or equivalent — cooling-off starts the day after delivery.
- [ ] Sealed-goods carve-out stated correctly: opened supplement pouches may be exempt from the statutory right for hygiene reasons — **but** our **30-day flavour guarantee deliberately exceeds statute**: opened pouches refundable within 30 days if you dislike the flavour. The two rights are stated side-by-side without the guarantee eroding the statutory right (see `operations/RETURNS_SOP.md`).
- [ ] Subscription: cancellation route works online in ≤ the effort it took to sign up; first renewal reminder configured.
- [ ] Refund timelines stated: within 14 days of cancellation (or of receiving goods back, for delivered orders).

## 7. Charity pledge

- [ ] Framing is exactly "20% of profits, audited annually"; recipients described as "vetted partners across eight causes" — **no partner named** (none signed).
- [ ] No donation totals claimed pre-audit; no hardship imagery/copy as ad bait.

## 8. Ads-specific (Google/Meta/TikTok)

- [ ] No sensitive-attribute targeting; no copy implying the viewer has a health problem or body insecurity (no "struggling with…?").
- [ ] Campaign is PAUSED at creation; budget within the £25/day fleet cap; approval recorded in `data/approvals.json`; publisher environment gate will still require founder sign-off.
- [ ] Landing URL carries correct `HB_UK_*` UTMs mirroring the campaign name (`analytics/utm-taxonomy.md`).
- [ ] Platform supplement policies met (e.g., no before/after — already banned by `docs/REJECTED_CLAIMS.md` #7).

## 9. Final gate

- [ ] Draft carries `compliance_status: PASS`, landing URL, UTM string, `register_checked` date.
- [ ] Human reviewer (founder) has read it aloud once — the brand-voice test — and approved it in `data/approvals.json`.
