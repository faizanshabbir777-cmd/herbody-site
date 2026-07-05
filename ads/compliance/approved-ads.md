# HerBody — Compliance pass: APPROVED (agent self-assessment)
**v1 · Reviewed against `data/config/brand-voice.md` hard rules 1–8, DMCC Act 2024, GB NHC register discipline, ASA/CAP.**
**"Approved" here = agent-level PASS. Nothing spends until the human approval file exists in `approvals/`.**

Checked for every item: authorised-claim wording only · zero testimonials/reviews (none exist) · no problem-calling · no urgency/scarcity · no before/after or transformation framing · no sensitive-health targeting · pledge phrased exactly ("20% of profits, audited") · cautions available on landing pages · UTM + landing URL present.

## Creative testing matrix (`ads/CREATIVE_TESTING_MATRIX.md`) — 30 of 32 PASS
- **Angle A (education):** CT-01, CT-02, CT-03, CT-04*, CT-05 — *CT-04's inositol line is capped at "studied in PCOS research" and stays organic-video-level; the paid ad text carries no inositol claim (CLM-20 restriction respected).
- **Angle B (value):** CT-06, CT-07, CT-08, CT-10 — CT-06/CT-07 approved **with condition** CLM-09: footnote present, prices re-verified each flight. (CT-09 rejected — see rejected-ads.md.)
- **Angle C (halal trust):** CT-11, CT-12, CT-13.
- **Angle D (ritual):** CT-14, CT-15, CT-16, CT-17.
- **Angle E (gentle start):** CT-18, CT-19 — wording locked; any edit toward "prevents/avoids bloating" is an automatic re-reject. (CT-20 rejected.)
- **Angle F (pledge):** CT-21, CT-22, CT-23, CT-24 — dignity framing verified; no named partners; no recipient imagery. CT-22 reviewed as borderline (meta-honest "no sad advert" line could read as using the topic while disclaiming it) — **passes** because it describes the mechanism and shows no recipients, but keep it out of rotation if any pledge-adjacent complaint arrives.
- **Angle G (price/day):** CT-25, CT-26, CT-27 — division shown; "no timer" copy is factual.
- **Angle H (myth-bust):** CT-28, CT-29, CT-30, CT-31 — CT-30 keeps exclusions inside the ad copy itself.
- **Angle I (guarantee):** CT-32 — flavour refund only.

## Meta campaigns — all listed ads PASS
- `HB_UK_META_PROSPECTING_THEDAILY_V1`: 7 ads (edu_dose01, val_maths01, pledge_twojobs01, myth_safety01, rit_10sec01, gentle_halfscoop01, val_oneshelf01).
- `HB_UK_META_RETARGETING_ENGAGERS_V1`: 6 ads — **conditional on activation rules in the file header** (pixel live, audiences exist at minimum size, engagement/traffic audiences only, never sensitive-health).
- `HB_UK_META_CREATIVE_TEST_V1`: 5 ads (edu_claim01, val_multivit01, rit_restday01, pledge_choice01, halal_cert01).

## TikTok campaigns
- `HB_UK_TT_PROSPECTING_THEDAILY_V1`: 7 ads PASS.
- `HB_UK_TT_RETARGETING_ENGAGERS_V1`: 6 ads PASS — same audience-existence + non-sensitive-audience conditions.
- `HB_UK_TT_SPARKADS_PREP_V1`: 4 ads **NEEDS_REVIEW by design** — they cannot PASS until the actual creator videos exist and are re-reviewed (script ≠ delivered video). Do not flip these to PASS in the file; re-assess per video.

## Google Search
- `HB_UK_GOOGLE_SEARCH_BRAND_V1` RSA: 15 headlines + 4 descriptions PASS (lengths verified ≤30/≤90).
- `HB_UK_GOOGLE_SEARCH_NONBRAND_V1` RSAs ×3: PASS. Keyword set verified free of condition terms; sensitive-health negative block present (pcos, hormones, bloating, pregnancy, menopause, weight loss, side effects…) — treat as immutable.
- Editor CSV `hb_uk_google_search_v1.csv`: content identical to YAML; import instructions require domain placeholder replacement first.

## UGC script bank (`marketing/UGC_SCRIPT_BANK.md`) — 30/30 PASS
All scripts creator/brand voice; EDU06/OBJ02/OBJ03 checked hardest (safety and bloating territory) — no blanket safety claims, no "no bloating" promise, exclusions present. ING01/OBJ04 carry the price-verification production note.

## Email & SMS banks
- `KLAVIYO_FLOWS.md`: all emails PASS **except P4 (review request), which is gated OFF** until `verification_flags.reviews_exist` is true — the gate is written into the flow. Winback WB3's optional incentive is placeholder-gated to founder approval.
- `EMAIL_COPY_BANK.md` approved lines: PASS. Rejected lines quarantined in the bank's rejected table.
- `SMS_COPY_BANK.md`: 6 SMS PASS (opt-out present, no claims beyond fact lines). Rejected drafts quarantined.

## Creative prompts (`marketing/CREATIVE_PROMPTS.json`) — 20/20 PASS
All negative prompts exclude medical imagery, before/after, body transformation, fake reviews/badges, children, pregnancy imagery, unlicensed logos. CP02 and CP07 carry mandatory notes (real label artwork; no invented seals).

---
**Standing conditions on the whole pack**
1. Everything is authored PAUSED/draft; the human approval file is the only launch key.
2. Price/value claims (CLM-09, CLM-10) re-verified before each flight.
3. Trademark usage (Creapure®, Verisol®, HMC mark) per licensor guidelines before creative export.
4. Any copy edit, however small, re-runs this pass — wording drift is how compliant ads become non-compliant.
