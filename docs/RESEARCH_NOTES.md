# Research Notes

Short, honest notes on the facts that shaped design decisions. These are working notes, not legal advice; the pre-publish checklist requires fresh lookups because registers and platform rules change.

## Regulatory (UK)

- **GB NHC register** (GOV.UK): post-Brexit Great Britain maintains its own register of authorised nutrition and health claims (retained Reg. (EC) 1924/2006). It is a **positive list** — no register entry, no claim. Key entries used: creatine/physical performance (condition: ≥3g/day); vitamin C/collagen formation; biotin/hair & skin; B6 & folate/tiredness-fatigue; B6/hormonal activity (verbatim-only in our policy); D3/bones-muscle-immune; chromium/macronutrient metabolism & blood glucose. **Collagen and hyaluronic acid have no authorised claims** — this drove Claims Matrix rows 2 and 7. Botanical claims: no authorised GB route relied on → traditional-use framing as brand policy with residual-risk flag.
- **DMCC Act 2024**: fake/unverifiable consumer reviews and commissioning/publishing them without reasonable verification steps are **banned practices**, directly enforceable by the CMA (fines up to 10% global turnover). Also tightened: drip pricing, fake urgency, subscription traps. Drove Decisions D6 and checklist §3, §5.
- **Consumer Contracts Regulations 2013**: 14-day cooling-off for distance sales starting day after delivery; refund within 14 days; sealed-goods hygiene exemption can apply to opened supplements — our 30-day flavour guarantee intentionally exceeds statute and must be presented alongside (never instead of) statutory rights. Drove `operations/RETURNS_SOP.md`.
- **Food Supplements Regulations 2003 (England) + equivalents**: mandatory statements — the "not a substitute for a varied, balanced diet" line, stated dose warning, keep-away-from-children. In checklist §2.
- **PECR + UK GDPR**: consent required before non-essential cookies/pixels; ICO guidance requires reject-as-easy-as-accept. Drove the consent-before-pixels architecture in `analytics/TRACKING_PLAN.md` §6.
- **ASA/CAP**: CAP Code section 15 (food supplements & health claims), 12 (medicines/medical claims), 3.31 (urgency/pressure), recognisability of ads (#ad). Health-professional endorsement restrictions → banned "doctor recommended".

## Platform constraints

- **TikTok Content Posting API**: apps must pass audit; **unaudited apps can post SELF_ONLY** (posts visible only to the creator). Consequence: manual-post bridge until audit — documented in the agent registry and morning guide.
- **Google Ads API**: developer token needs approval; new accounts realistically start without it. **Ads Editor CSV import** is the fully supported manual path → Decision D5.
- **Meta Marketing API**: campaigns can be created with `status=PAUSED`; CAPI dedupes browser/server via matching `event_name` + `event_id`.
- **Shopify**: Subscriptions app (first-party) handles selling plans, dunning and customer portal without custom app development → Decision D8. Customer Events (web pixels) is the sanctioned injection point for analytics with a consent API.
- **Anthropic API**: prompt caching discounts repeated stable prefixes — `brand-voice.md` is the cached prefix for every agent call; structured outputs give schema-valid queue JSON. Cost telemetry lands in the daily brief.

## Product facts

- All doses, prices, servings and certification texts come **only** from `data/config/product-facts.json` (formula v14, locked). Two open verification items found during this work: **zinc** (claimed pattern in voice pack, absent from locked formula → embargoed) and **"the math" retail prices** (JSON self-flags "verify before publishing"). Both tracked in `docs/ASSUMPTIONS.md`.
- Price-per-day arithmetic verified: £33.99 ÷ 21 = £1.6186 → "from £1.62 a day"; £39.99 ÷ 21 = £1.904 → £1.90/day.

## What we did not research (deliberately out of scope)

- US regulatory frame (FDA/DSHEA/FTC) — replaced wholesale, Decision D7.
- Amazon marketplace requirements — no Amazon layer in this build.
- Medical/clinical literature review of ingredients — we make no claims requiring one; the register is the ceiling.
