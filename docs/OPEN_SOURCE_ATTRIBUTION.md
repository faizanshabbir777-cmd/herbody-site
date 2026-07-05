# Open Source Attribution

Short and complete. If it isn't listed here, it isn't in the build.

## Code we ship

**No third-party code was copied into this repository.** All theme code (`shopify/theme/`), site code, dashboard code (`/dash/`) and agent code (`agents/`) is original work written for HerBody against public platform documentation.

## Dependencies (installed packages)

| Package | Licence | Use |
|---|---|---|
| `@anthropic-ai/sdk` | MIT | The only runtime dependency. Official Anthropic client used by all agents for Claude API calls (structured outputs + prompt caching). |

Rationale for the single-dependency posture: `docs/DEPENDENCY_DECISIONS.md`.

## Inspiration — used for patterns, no code taken

- **Shopify Dawn** (github.com/Shopify/dawn). Studied for OS 2.0 theme architecture (sections/snippets/JSON templates, custom-element product form). Dawn is distributed under Shopify's own licence terms; to keep licensing unambiguous **no Dawn code, markup, styles or assets were copied** — architecture concepts only, which are not subject to copyright. Anyone auditing may diff `shopify/theme/` against Dawn: no shared code will be found.

## Documentation consulted (no licence implications — reading docs, not copying implementations)

- Shopify Admin GraphQL API & theme documentation (shopify.dev)
- Anthropic API documentation (structured outputs, prompt caching)
- TikTok Content Posting API documentation (including the unaudited → SELF_ONLY visibility rule)
- Meta Graph API & Marketing API documentation
- Google Ads Editor CSV import documentation
- Klaviyo developer documentation
- GOV.UK: GB nutrition and health claims register; CMA guidance on the DMCC Act 2024; ICO guidance on PECR/cookies

## Fonts

- **Shantell Sans** — SIL Open Font License 1.1
- **Hanken Grotesk** — SIL Open Font License 1.1
- **Caveat** — SIL Open Font License 1.1

All three are OFL: free to use, embed and self-host commercially; the fonts themselves may not be sold standalone. Self-hosted (no Google Fonts CDN calls — keeps pre-consent pages free of third-party requests, see `analytics/TRACKING_PLAN.md` §6).

## Trademarks referenced in copy (not open source — used nominatively with permission chains via suppliers)

- **Creapure®** (Alzchem Trostberg GmbH) and **Verisol®** (Gelita AG) — branded ingredient marks, used to describe genuine ingredients supplied under those marks. TODO_VERIFY at launch: supplier brand-usage guidelines on file (both suppliers publish logo/name usage rules for customers).
- Shopify, TikTok, Meta, Instagram, Google, Klaviyo referenced nominatively as platforms.
