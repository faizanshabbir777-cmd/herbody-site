# HerBody — Klaviyo Flows (UK) · v1
**Drafts only — human approves before activation. British English, £ prices.**

Facts: `data/config/product-facts.json`. Rules: `data/config/brand-voice.md`.

**Every email footer must include:** "For healthy adults. Not suitable if pregnant or breastfeeding. Consult your GP if taking medication or managing a condition." + "Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle." + HerBody Ltd, London + unsubscribe link.

**UTM base (append per email):** `?utm_source=klaviyo&utm_medium=email&utm_campaign=hb_uk_em_<flow>_v1&utm_content=<email_id>`
Product page: `https://{{SHOPIFY_STORE_DOMAIN}}/products/the-daily-creatine-collagen`

**Global bans:** no fake urgency/countdowns, no testimonials or review stars (none exist — DMCC), no results promises or timelines, no problem-calling ("struggling with…"), claims only within GB NHC authorised wording.

---

## FLOW 1 — Welcome (trigger: newsletter/lead-magnet signup · 5 emails)

### W1 · Send immediately — Brand + why (+ lead magnet delivery if promised)
- **Subject:** Welcome to HerBody — here's the whole idea
- **Preview:** One scoop for you. Two tokens for her.
- **Body outline:** Warm hello → the one-sentence brand ("The strength you build helps build hers") → what The Daily is: 5g creatine + 5g Verisol® collagen + a complete multivitamin, one 14g strawberry-lemonade scoop → halal certified, batch tested, made in the UK → the pledge in one line (20% of profits, audited; you choose the cause) → if lead magnet: button "Get your First 7 Days plan" → what to expect from these emails (facts, no hype).
- **CTA:** "Meet The Daily" → product page `utm_content=w1_brand`

### W2 · Day 1 — The studied dose (education)
- **Subject:** Why we print every dose on the front
- **Preview:** 5g + 5g + a complete multivitamin. Here's why the numbers matter.
- **Body outline:** The problem with proprietary blends (you can't compare a secret) → creatine: the studied daily amount is 3–5g; The Daily carries the full 5g of Creapure® → the authorised claim, quoted exactly: "increases physical performance in successive bursts of short-term, high-intensity exercise" → Verisol® at 5g, a full studied serving → multivitamin at 100% NRV → "Nothing hidden, nothing vague."
- **CTA:** "Read the full label" → product page `utm_content=w2_dose`

### W3 · Day 3 — Your first 7 days, planned
- **Subject:** The gentle way to start (your 7-day plan)
- **Preview:** Half a scoop, one kettle, zero pressure.
- **Body outline:** Deliver/re-link `LEAD_MAGNET_FIRST_7_DAYS_PLAN` → why week one is a half scoop (7g): building the habit gently, no loading phase → the kettle anchor trick → honest expectations: creatine works by consistency over weeks, not by feeling different on day two → 21 servings = 21 mornings.
- **CTA:** "Get the plan" → lead magnet page `utm_content=w3_plan`

### W4 · Day 5 — The pledge story
- **Subject:** Where 20% of our profits go
- **Preview:** Audited. Allocated by you.
- **Body outline:** The pledge, plainly: 20% of profits, audited annually, fund refuge, care and crisis support for women → the mechanism: every pouch earns 2 charity tokens in the app; you allocate them across eight vetted causes → why tokens (checkable, yours to steer) → dignity note: no sad adverts, ever → "Good for you. Good for her."
- **CTA:** "See how the pledge works" → product page pledge section `utm_content=w4_pledge`

### W5 · Day 7 — Offer reminder
- **Subject:** Make it yours — from £1.62 a day
- **Preview:** £33.99 subscribed · 21 servings · 30-day flavour guarantee.
- **Body outline:** Straight recap: £39.99 one-time or £33.99 subscribed (save 15%) → per-day maths shown working: £33.99 ÷ 21 = £1.62/day → 30-day flavour guarantee: hate it, we refund the pouch → shipping from London → no countdown, no pressure — "it'll still be £1.62 a day tomorrow."
- **CTA:** "Start your ritual" → product page `utm_content=w5_offer`

---

## FLOW 2 — Browse abandonment (trigger: Viewed Product, no ATC, 4h delay · 2 emails)

### B1 · +4 hours
- **Subject:** Still reading the label? Good.
- **Preview:** That's exactly the kind of customer we make this for.
- **Body outline:** Light, respectful re-open: "You had a look at The Daily — take your time, label-readers are our people" → three facts to help decide: full doses printed (5g + 5g + 100% NRV), halal certified + batch tested with COA per lot, 30-day flavour guarantee → link to FAQ (who it's not for: pregnancy/breastfeeding; GP if on medication).
- **CTA:** "Back to The Daily" → product page `utm_content=b1_label`

### B2 · +2 days (skip if purchased/ATC)
- **Subject:** The one question that decides it
- **Preview:** "Would I actually take this every morning?"
- **Body outline:** Frame the real decision: not "is it good" but "will it happen daily" → the ritual answer: 10-second shake, strawberry lemonade, kettle anchor → the gentle start (half-scoop week) → per-day price frame (£1.62 subscribed) → guarantee as the safety net.
- **CTA:** "Start your ritual" → product page `utm_content=b2_ritual`

---

## FLOW 3 — Cart abandonment (trigger: Added to Cart, no checkout, 1h delay · 3 emails)

### C1 · +1 hour
- **Subject:** Your pouch is in the cart
- **Preview:** 21 mornings, ready when you are.
- **Body outline:** Simple nudge with cart contents block → one-line reassurance stack: 30-day flavour guarantee · ships from London · halal certified · batch tested → no urgency language at all.
- **CTA:** "Return to your cart" → cart URL `utm_content=c1_nudge`

### C2 · +24 hours
- **Subject:** Two honest answers before you decide
- **Preview:** Taste, and the first week.
- **Body outline:** Pre-empt the two commonest hesitations, honestly: (1) Taste — strawberry lemonade, no added sugar; if you hate it we refund the pouch, 30 days. (2) Starting — week one is a half scoop, the gentle way to start; no loading phase → pregnancy/breastfeeding + GP caution restated → link to First 7 Days plan.
- **CTA:** "Finish checkout" → cart URL `utm_content=c2_answers`

### C3 · +3 days
- **Subject:** The maths, one last time
- **Preview:** £1.62 a day, subscribed. That's the whole pitch.
- **Body outline:** Per-day maths worked through → what one scoop replaces (~£130 of comparable separates at typical UK retail — *prices checked at time of writing*) → subscribe option: £33.99, pause or cancel any time → close warmly, zero pressure: "No countdown here. It's your morning; we just want to be in it."
- **CTA:** "Complete your order" → cart URL `utm_content=c3_maths`

---

## FLOW 4 — Checkout abandonment (trigger: Started Checkout, no purchase, 1h delay · 2 emails)

### K1 · +1 hour
- **Subject:** You were one step away
- **Preview:** Your checkout is saved — no rush.
- **Body outline:** Saved-checkout link up top → answer the checkout-stage doubts: payment is secured by Shopify; ships from London; 30-day flavour guarantee → delivery expectations → support email for any question ("a human reads these").
- **CTA:** "Pick up where you left off" → checkout URL `utm_content=k1_resume`

### K2 · +24 hours
- **Subject:** Anything we can answer?
- **Preview:** Real question, real answer — just reply.
- **Body outline:** Service-first, not salesy: invite a reply with any question → the three most-asked at this stage, answered in two lines each (subscription flexibility — pause/cancel any time; who it's not suitable for; when it ships) → single quiet CTA.
- **CTA:** "Complete your order" → checkout URL `utm_content=k2_questions`

---

## FLOW 5 — Post-purchase (trigger: Placed Order · 5 emails)

### P1 · Day 0 (after order confirmation) — How-to + gentle start
- **Subject:** Your pouch is on its way — here's day one
- **Preview:** Half a scoop, 200ml cold water, 10 seconds.
- **Body outline:** Thank you, warm and short → how-to: scoop 14g, shake with 200ml cold water for 10 seconds, drink every morning — training days and rest days → **your first 7 days: half scoop (7g), day 8+: full scoop** → link the First 7 Days plan → cautions restated.
- **CTA:** "Read your 7-day plan" → plan page `utm_content=p1_howto`

### P2 · Day 10 — What to expect (evidence-cautious)
- **Subject:** Week two: what's actually happening
- **Preview:** Honest timelines, no fairy tales.
- **Body outline:** Set expectations honestly: creatine builds up gradually with daily use over weeks — most of what matters early is invisible; consistency is the work → collagen and the multivitamin are long-game daily nutrients — think months, not mornings → what NOT to expect: we don't promise how you'll look or feel, and nobody honestly can → the one thing to do: keep the morning anchor. *(NO "by week 2/4/8 you will see/feel X" promises — describe the mechanism and the habit, never guaranteed outcomes.)*
- **CTA:** "Keep your streak — set a reminder" → app page `utm_content=p2_expectations`

### P3 · Day 14 — Batch transparency + app & tokens onboarding
- **Subject:** Your batch has a paper trail (and your tokens are waiting)
- **Preview:** COA on request · 2 tokens to allocate.
- **Body outline:** Find your batch code on the pouch (format like HB-26·0417) → every batch has a third-party certificate of analysis — reply and we'll send yours → app onboarding: download, log your pouch, allocate your 2 charity tokens across eight vetted causes; Skin Score feature intro (a private way to track your own skin over weeks — yours, not ours) → "20% of profits, audited."
- **CTA:** "Open the app & place your tokens" → app page `utm_content=p3_app_tokens`

### P4 · Day 21 — Review request **[GATED — DO NOT ACTIVATE]**
- **Subject:** *(placeholder)* How's the ritual going?
- **Preview:** *(placeholder)*
- **Body outline:** **DMCC GATE: this email stays DRAFT/OFF until a real, verifiable review platform is live and `verification_flags.reviews_exist` is true.** When live: invite an honest review on the verified platform — explicitly welcome critical feedback, never incentivise positive reviews, never cherry-pick. Until then this slot sends nothing. *(Interim alternative, optional: a plain "reply and tell us anything" feedback email with no publication of quotes.)*
- **CTA:** *(gated)* "Leave an honest review" `utm_content=p4_review`

### P5 · Day 25 — Referral seed
- **Subject:** Know someone who reads labels too?
- **Preview:** Give £5, get £5 — when it's live.
- **Body outline:** Soft referral: if a friend would appreciate the studied-dose approach, send her the First 7 Days plan link (free, useful, no strings) → referral programme note: {{REFERRAL_OFFER — activate only when Shopify referral app is configured}} → pledge reminder: every pouch she buys earns her 2 tokens too.
- **CTA:** "Share the 7-day plan" → plan page `utm_content=p5_referral`

---

## FLOW 6 — Replenishment (21 servings → trigger day 16–18 after delivery; skip active subscribers)

### R1 · Day 16
- **Subject:** About 5 mornings left in your pouch
- **Preview:** Keep the streak unbroken.
- **Body outline:** Factual count: 21 servings; if you started on delivery day you're near the bottom → why continuity matters for creatine (daily consistency is the mechanism — a gap just means rebuilding) → easiest path: subscribe at £33.99 (save 15%, from £1.62/day, pause or cancel any time) or reorder one-time → ships from London.
- **CTA:** "Refill my mornings" → product page `utm_content=r1_refill`

### R2 · Day 19 (skip if reordered)
- **Subject:** Last scoop this week?
- **Preview:** Reorder in two taps — no subscription needed.
- **Body outline:** Short and useful: one-time £39.99 or subscribe £33.99 → no scare language about "losing progress" — just "the ritual works best unbroken" → guarantee + support links.
- **CTA:** "Reorder The Daily" → product page `utm_content=r2_lastscoop`

---

## FLOW 7 — Winback (trigger: no purchase in X days, non-subscriber)

### WB1 · Day 45
- **Subject:** Your morning slot is still open
- **Preview:** Nothing's changed — same dose, same maths.
- **Body outline:** Warm re-open, no guilt → anything new (flavour notes, app features) → restate the core: 5g + 5g + a complete multivitamin, £1.62/day subscribed → invite a reply if something didn't work ("we genuinely want to know").
- **CTA:** "Come back to the ritual" → product page `utm_content=wb1_return`

### WB2 · Day 60
- **Subject:** What stopped the streak?
- **Preview:** One-tap answer — helps us more than you'd think.
- **Body outline:** Feedback-first email: three tappable reasons (price / taste / routine never stuck) each linking to a genuinely relevant response page (per-day maths; flavour guarantee; the 7-day plan + kettle anchor) → thank-you regardless → no discount pressure here.
- **CTA:** "Tell us in one tap" → feedback links `utm_content=wb2_why`

### WB3 · Day 90
- **Subject:** If it's a fit, it's a fit — last note from us
- **Preview:** We'll stop nudging after this one.
- **Body outline:** Respectful close: this is the last winback note (say so, mean it) → {{OPTIONAL_OFFER — only if founder approves a genuine, non-fake-urgency incentive, e.g. free shipping code with honest validity}} → the pledge as the parting thought: 20% of profits, audited — "Good for you. Good for her." → preference-centre link (fewer emails vs unsubscribe).
- **CTA:** "Start again from £1.62 a day" → product page `utm_content=wb3_last`

---

## SMS SECTION (UK)

### Opt-in consent copy (checkout/popup — PECR/GDPR compliant)
> "Tick to receive HerBody texts (order updates + occasional offers, max ~4/month). We'll never share your number. Msg rates may apply. Reply STOP to opt out any time, HELP for help. See our Privacy Policy: {{PRIVACY_URL}}."

Consent must be a separate unticked checkbox, logged with timestamp. Quiet hours: send 09:00–20:00 UK only. Every marketing SMS ends with "Txt STOP to opt out".

### 6 compliant SMS (marketing; ≤~320 chars incl. opt-out; no urgency fakery, no claims beyond approved)

1. **SMS-W1 (welcome):** "HerBody: welcome 💪 One scoop: 5g creatine + 5g collagen + a complete multivitamin. Your First 7 Days plan: {{link}} Txt STOP to opt out"
2. **SMS-C1 (cart, +2h):** "HerBody: your pouch is waiting in the cart — 21 mornings, 30-day flavour guarantee. Finish up: {{link}} Txt STOP to opt out"
3. **SMS-R1 (replenish, day 17):** "HerBody: roughly 4 scoops left in your pouch. Keep the streak: refill from £1.62/day subscribed. {{link}} Txt STOP to opt out"
4. **SMS-P1 (post-purchase, day 1 of use):** "HerBody: day one = half scoop + 200ml cold water, 10-sec shake. The gentle way to start. Full plan: {{link}} Txt STOP to opt out"
5. **SMS-T1 (tokens):** "HerBody: your 2 charity tokens are ready in the app — you choose the cause. 20% of profits, audited. {{link}} Txt STOP to opt out"
6. **SMS-WB1 (winback, day 60):** "HerBody: the ritual's here when you want it — same studied doses, £1.62/day subscribed. {{link}} Txt STOP to opt out"

Transactional SMS (order/shipping) are separate and carry no marketing content.

---
*Reusable lines extracted to `marketing/EMAIL_COPY_BANK.md` and `marketing/SMS_COPY_BANK.md`.*
