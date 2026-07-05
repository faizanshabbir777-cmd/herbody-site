# HerBody — Compliance pass: REJECTED / NEEDS-REVIEW
**v1 · These lines were drafted in this pack and failed the self-assessed compliance pass. Kept on record so they are not redrafted. Rejection reasons cite `data/config/brand-voice.md` hard rules.**

## REJECTED

### REJ-01 — CT-20 "Debloat your mornings" (creative matrix, Angle E)
- **Draft:** Hook "Debloat your mornings" · primary text "Dandelion root, traditionally used for fluid balance, helps The Daily keep your mornings light and debloated…" · headline "Lighter mornings".
- **Why it looked plausible:** it name-checks the traditional-use framing, and dandelion's role field mentions "de-bloat".
- **Why it fails:** the sentence structure converts a traditional-use botanical into a product efficacy promise ("helps… keep your mornings debloated") — breach of hard rule 1 (botanicals: traditional-use framing only, never an efficacy promise). "Debloat your mornings" also implies the viewer's mornings are currently bloated — the problem-calling pattern of hard rule 7 by implication. And "de-bloat" sits next to banned "water weight" diet-culture territory (lexicon AVOID).
- **Decision:** REJECTED, no rewrite — no compliant version keeps the hook. Territory is covered compliantly by CT-18/CT-19. `utm_content=gentle_debloat01` retired.

### REJ-02 — CT-09 "Tired of taking six different supplements?" (creative matrix, Angle B)
- **Draft:** Hook/primary text opening "Tired of taking six different supplements?" / "Tired of rattling through six bottles every morning?"
- **Why it looked plausible:** it's a convenience pain-point, not a health problem — many DTC brands would run it.
- **Why it fails:** it is the exact "second-person problem-calling" construction hard rule 7 bans ("say what the product does, not what's wrong with her"). The rule's examples are health-flavoured, but the pattern is the rule; a "tired of…?" opener trains the account into problem-calling habits and is the borderline we choose to lose.
- **Decision:** REJECTED. Replaced by CT-10 "Six supplements. One scoop." (declarative, product-fact framing) — approved.

### REJ-03 — Email subject draft "Stronger nails by week 8?" (post-purchase P2 drafting)
- **Draft:** Subject line for the week-2 expectations email.
- **Why it looked plausible:** phrased as a question, and biotin does hold an authorised claim in the hair/skin/nails neighbourhood.
- **Why it fails:** a dated outcome ("by week 8") is a results-timeline promise — hard rule 2 (guaranteed results) — and "stronger nails" exceeds the authorised maintenance-of-normal wording. The question mark does not launder the claim (ASA treats implied claims as claims).
- **Decision:** REJECTED. P2 ships with "Week two: what's actually happening" and mechanism-only body copy. Quarantined in `marketing/EMAIL_COPY_BANK.md`.

### REJ-04 — RSA headline draft "Clinically Proven Formula" (Google non-brand drafting)
- **Draft:** Candidate headline for the shared non-brand RSA set.
- **Why it looked plausible:** the two lead ingredients genuinely are clinically studied at these doses.
- **Why it fails:** hard rule 2 names it directly — "clinically proven [product]" is banned; only ingredients are studied, and "proven" overstates even those. In a 30-character headline there is no room for the qualification that would make it honest.
- **Decision:** REJECTED before import; never entered the YAML or CSV. Compliant neighbour "The Studied 5g Dose" used instead.

### REJ-05 — SMS draft "Your pouch is running low — she's counting on you"
- **Draft:** Replenishment SMS pairing the refill nudge with the charity pledge.
- **Why it looked plausible:** it connects two true things (replenishment timing + the pledge).
- **Why it fails:** it weaponises the pledge as guilt — direct breach of hard rule 6 / pledge framing rule ("solidarity not saviour… never guilt") and uses recipients' need as purchase pressure. Also manufactures emotional urgency, adjacent to rule 4.
- **Decision:** REJECTED. Approved replacement is SMS-R1 (factual scoop count + per-day price). Quarantined in `marketing/SMS_COPY_BANK.md`.

### REJ-06 — Email subject draft "Balance from within — your hormones will thank you"
- **Draft:** Candidate welcome-flow subject leaning on the inositol content.
- **Why it looked plausible:** soft, non-clinical wording; no disease named.
- **Why it fails:** "your hormones will thank you" is a hormone-fixing outcome promise — hard rule 2 explicitly caps inositol at "studied in PCOS research" and bans "balances your hormones" as an outcome. Vague phrasing makes it worse, not better (unfalsifiable implied efficacy).
- **Decision:** REJECTED. No hormone-outcome subject lines, ever. Quarantined in `marketing/EMAIL_COPY_BANK.md`.

## NEEDS_REVIEW (not rejected — blocked pending evidence or assets)

| Item | Where | Why it can't PASS yet | Unblock condition |
|---|---|---|---|
| 4 Spark ads (spark_edu01, spark_obj02, spark_rit01, spark_ing02) | `HB_UK_TT_SPARKADS_PREP_V1.yaml` | Scripts are approved, but the ad is the *delivered creator video*, which does not exist yet — ad-libs can introduce claims | Re-review each final video + authorisation code before status change |
| Post-purchase P4 review-request email | `KLAVIYO_FLOWS.md` | No verifiable review platform exists; sending would pressure-create review content we cannot lawfully publish (DMCC) | `verification_flags.reviews_exist == true` + platform live |
| CLM-09 value comparison ("~£130") in any NEW placement | matrix/emails | Approved only where the footnote travels with the claim; short formats (SMS, RSA headlines) cannot carry the footnote | Never use in footnote-less formats |
| CT-22 "no sad advert" pledge ad | matrix Angle F | Passed, flagged borderline: meta-honesty about not exploiting the topic must not become its own exploitation | Monitor comments/complaints in first flight; pull on any pledge-adjacent complaint |

---
*Process note: at least two of the rejections above (REJ-02, REJ-03) were genuinely arguable — they were rejected because the brand's stated rules choose the cautious side of the line. That is the system working as designed.*
