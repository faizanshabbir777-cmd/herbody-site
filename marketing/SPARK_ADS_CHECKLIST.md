# HerBody — Spark Ads Checklist (TikTok UK)
**v1 · Run top-to-bottom for every Spark ad. Nothing goes live without the human approval file (see `approvals/`).**

## A. Before the creator posts
- [ ] Signed brief on file (`marketing/CREATOR_BRIEF.md` template) with usage rights + Spark authorisation clause.
- [ ] Script/claims pre-approved against the do/don't lists — creator voice only, zero testimonial framing (DMCC), claims within GB NHC authorised wording.
- [ ] Disclosure agreed: `#ad` first hashtag + paid-partnership toggle on.
- [ ] Caption carries: "For healthy adults. Not suitable if pregnant or breastfeeding."

## B. Authorisation handshake
- [ ] Creator enables: Settings → Creator tools → Ad settings → **Ad authorisation**.
- [ ] Creator authorises the specific video, duration ≥ 60 days, sends the **video code**.
- [ ] Code logged in `data/briefs/` with: creator handle, video URL, code, expiry date, brief reference.
- [ ] Calendar reminder set 7 days before authorisation expiry (renew or pause the ad).

## C. Build (always PAUSED first)
- [ ] Campaign built from `ads/tiktok/campaigns/HB_UK_TT_SPARKADS_PREP_V1.yaml` — status PAUSED.
- [ ] Identity: **Use TikTok account to deliver Spark Ads** → creator's authorised post selected via code.
- [ ] Destination: `https://{{SHOPIFY_STORE_DOMAIN}}/pages/tiktok` with full `HB_UK_*` UTM (lowercase).
- [ ] Targeting: UK only, women, 18–54. **No sensitive-health interest targeting, ever.**
- [ ] Budget within channel cap: TikTok total ≤ £25/day across all campaigns.
- [ ] Pixel + Events API verified firing (see `marketing/TIKTOK_GROWTH_PACK.md` §5) before spend.

## D. Compliance gate (reject → back to draft)
- [ ] Video re-watched at ad stage: no results claims, no before/after, no testimonial framing, no problem-calling, no urgency.
- [ ] Ad text (if added) uses only lines already approved in `ads/compliance/approved-ads.md`.
- [ ] Comments plan: keep comments ON but monitored daily; never reply with claims beyond the approved list; testimonial-soliciting replies ("tell us your results!") are banned.
- [ ] Entry added to `ads/compliance/ad-claims-matrix.csv` for any new claim (there shouldn't be one).

## E. Launch + monitor
- [ ] Human approval file present and campaign listed in `approved_campaigns` → only then flip PAUSED → ACTIVE.
- [ ] Day 1: verify spend pacing ≤ budget, UTM landing sessions visible in analytics.
- [ ] Day 3: CPC/CTR/CPA snapshot to `data/metrics/tiktok/`.
- [ ] Authorisation expiry check weekly; ad paused automatically if code lapses.
- [ ] Any comment reporting an adverse reaction → screenshot, reply with GP-referral template, escalate to founder same day. Never diagnose, never advise.

## F. Whitelisting beyond Spark (Meta)
- [ ] Separate written permission required — Spark authorisation does NOT cover Meta.
- [ ] Meta whitelisting via creator's Business Manager partnership; same claim rules, `#ad`/Paid partnership label preserved.
