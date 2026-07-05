# HerBody — Brand Guide (Cream v10 system, summary)

The working design system for every HerBody surface: Shopify theme, brand site, dashboards, ads, social. Full voice rules live in `data/config/brand-voice.md`; this guide covers the visual system and shows the voice applied.

---

## 1. Colour tokens

| Token | Hex | Role |
|---|---|---|
| `--hb-cream` | `#EDEAE2` | Primary background. Warm, papery, never pure white. The brand *is* cream — pink is punctuation. |
| `--hb-ink` | `#0A0A0B` | Text, wordmark, rules/borders. Near-black, softer than `#000`. |
| `--hb-pink` | `#FF2D8E` | The single accent. CTAs, the `+` in the wordmark, sparkle ✦, active states, price highlights. Use sparingly — one hit per viewport as a guide. |
| `--hb-blush` | `#F5B8CF` | Soft support: pill backgrounds, hover states, section tints, chart fills. Never for text on cream (contrast fails). |

Contrast rules: body text is always ink-on-cream (passes AAA). Pink `#FF2D8E` on cream passes for large text and UI elements only — never body copy. White text on pink for buttons is permitted at ≥16px semibold.

## 2. Typography

| Font | Role | Notes |
|---|---|---|
| **Shantell Sans** | Display: H1/H2, hero lines, big numbers ("5g + 5g"), wordmark companion text | Warm, hand-informed but legible — femme without script. Weights 500–800. Tight leading (1.05–1.15) on heroes. |
| **Hanken Grotesk** | Everything else: body, UI, buttons, tables, captions, legal | Workhorse grotesk. 400/500/700. Body 16–18px, line-height 1.6. Legal text never below 12px. |
| **Caveat** | Annotation only: margin notes, "she chose refuge →" style asides, circled sparks on imagery | The founder's-pen voice. Never for claims, prices, doses or anything load-bearing — annotations are feeling, not fact. Max ~6 words per use. |

## 3. Wordmark

The lockup is **HER+BODY** — Shantell Sans, ink, all caps, tracking slightly tight, with the `+` set in pink `#FF2D8E`.

- The pink `+` is the brand's whole thesis in one glyph: her strength *plus* her body, one woman *plus* another (the pledge).
- Never letterspace the `+` away from the words; never recolour it except all-ink (mono contexts) or all-cream (on ink/pink grounds).
- Minimum clear space: the width of the `+` on all sides. Minimum size: 24px height digital.
- Product lockup: `HERBODY No.01 — The Daily` with the catalogue number in Hanken Grotesk.

## 4. The ✦ sparkle

A four-point sparkle `✦` in pink is the only decorative mark.

- Use: list bullets on hero features, a single accent beside the wordmark, section dividers (`✦` centred, small), the "approved" state in dashboards.
- Never: more than three per viewport, never animated spins, never as emoji-confetti, never replacing required symbols (®, †).
- In running text, `✦` may prefix trust pills: "✦ Tested every batch".

## 5. Photography & imagery

- **Real women, real mornings.** Kitchen counters, gym bags by the door, morning light through a window. The scoop-and-shake ritual, hands, glassware, condensation.
- Warm directional light (golden-hour or soft window light), cream/neutral wardrobe and surfaces so the pink pack accent carries.
- Diverse UK-real casting: ages 22–38 core but not exclusively; visible strength welcome (gym contexts), always dignified.
- **Never:** body-transformation imagery, waist-grabbing, scales, tape measures, before/after splits, "flat tummy" poses, filtered-to-glass skin faces, stock-photo lab coats.
- Product renders sit on cream with a single soft shadow; no lifestyle-collage clutter.

## 6. Tone applied — six before → after rewrites

| ✗ Before (generic supplement voice) | ✓ After (HerBody voice) | Why it works |
|---|---|---|
| "Unlock your best self with our revolutionary female-optimised formula!" | "5g + 5g + a complete multivitamin. One scoop. Nothing hidden." | Numbers persuade; adjectives don't. Evidence over hype. |
| "Struggling with bloating and low energy? We've got you, girl!" | "Made for the mornings you train, and the mornings you barely make the bus." | Never problem-call her body. Talk WITH her — warm, not weak. |
| "Clinically proven collagen melts away fine lines in 28 days!" | "5g Verisol® collagen, with vitamin C — which contributes to normal collagen formation for normal skin." | Rejected claim → authorised route. Clinical AND kind. |
| "Optimise your protocol with our engineered performance stack." | "A ritual, not a protocol. One scoop, every morning — training days and rest days." | Body as self, not machine. Lexicon rules applied. |
| "Buy now! Only 4 left! 2,000+ 5-star reviews!" | "Make it yours · £39.99 — or from £1.62 a day. Hate the flavour? We refund the pouch." | No fake urgency, no fake reviews (DMCC). Real guarantees do the persuading. |
| "For every purchase we give back to women in need 💕" | "20% of profits — audited — fund refuge, care and crisis support. You choose the cause. Good for you. Good for her." | Solidarity, not saviour. Specific, audited, her choice. |

## 7. Layout & component notes

- Generous cream whitespace; ink hairline rules (1px `#0A0A0B` at 15–20% opacity) structure sections — the "label" aesthetic of a supplement facts panel, warmed up.
- Buttons: pink fill, cream text, fully rounded (`border-radius: 999px`), Hanken Grotesk 600. Secondary: ink outline on cream.
- Trust pills: blush background, ink text, ✦ prefix optional.
- Price display always pairs frames: "£39.99 · from £1.62 a day with subscribe".
- Dark surfaces (dashboards, footer): ink background, cream text, pink accents unchanged.
- Motion: fades and 200–300ms eases only. Nothing bounces, nothing counts down.
