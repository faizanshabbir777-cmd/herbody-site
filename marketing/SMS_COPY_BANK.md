# HerBody — SMS Copy Bank (UK) · v1
**Reusable approved SMS lines. PECR/GDPR: marketing SMS only to logged opt-ins; quiet hours 09:00–20:00 UK; every marketing SMS ends "Txt STOP to opt out".**

## Opt-in consent copy (approved)
> "Tick to receive HerBody texts (order updates + occasional offers, max ~4/month). We'll never share your number. Msg rates may apply. Reply STOP to opt out any time, HELP for help. See our Privacy Policy: {{PRIVACY_URL}}."

Separate unticked checkbox · consent timestamp logged · STOP/HELP honoured automatically.

## Approved marketing SMS (≤~320 chars)
| ID | Copy | Use |
|----|------|-----|
| SMS-W1 | HerBody: welcome 💪 One scoop: 5g creatine + 5g collagen + a complete multivitamin. Your First 7 Days plan: {{link}} Txt STOP to opt out | Welcome |
| SMS-C1 | HerBody: your pouch is waiting in the cart — 21 mornings, 30-day flavour guarantee. Finish up: {{link}} Txt STOP to opt out | Cart +2h |
| SMS-R1 | HerBody: roughly 4 scoops left in your pouch. Keep the streak: refill from £1.62/day subscribed. {{link}} Txt STOP to opt out | Replenish day 17 |
| SMS-P1 | HerBody: day one = half scoop + 200ml cold water, 10-sec shake. The gentle way to start. Full plan: {{link}} Txt STOP to opt out | Post-purchase |
| SMS-T1 | HerBody: your 2 charity tokens are ready in the app — you choose the cause. 20% of profits, audited. {{link}} Txt STOP to opt out | Tokens |
| SMS-WB1 | HerBody: the ritual's here when you want it — same studied doses, £1.62/day subscribed. {{link}} Txt STOP to opt out | Winback day 60 |

## Reusable fragments
- "5g creatine + 5g collagen + a complete multivitamin"
- "from £1.62/day subscribed"
- "30-day flavour guarantee"
- "The gentle way to start"
- "you choose the cause"
- "Txt STOP to opt out" (mandatory closer)

## ❌ REJECTED SMS (do not resurrect)
| Draft | Why rejected |
|---|---|
| "HerBody: your pouch is running low — she's counting on you. Refill: {{link}}" | Uses the pledge as guilt leverage — violates "solidarity not saviour / never guilt". See `ads/compliance/rejected-ads.md` REJ-05. |
| "HerBody: only a few pouches left this week!" | Fake scarcity — banned outright. |

## Hard rules for any new SMS
- No claims beyond the approved email-bank claim list; SMS is too short for authorised-claim wording, so stick to formula/price/ritual/pledge facts.
- No urgency fakery, no problem-calling, no results language, no testimonials.
- Marketing and transactional streams stay separate.
