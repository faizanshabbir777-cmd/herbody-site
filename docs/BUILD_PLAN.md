# HerBody — Build Plan

**Repo:** `faizanshabbir777-cmd/herbody-site` · **Market:** United Kingdom · **Currency:** GBP · **Date:** July 2026

---

## 1. Objective

Launch **HerBody No.01 — The Daily** (5g Creapure® creatine + 5g Verisol® collagen + a complete multivitamin, one 14g strawberry-lemonade scoop, 21 servings, £39.99 one-time / £33.99 subscribe) as a UK direct-to-consumer Shopify business, operated day-to-day by a fleet of AI agents that **draft everything and publish nothing** without human approval.

Success at launch means:

1. A Shopify store that is legally publishable in the UK — every claim on it traceable to the GB nutrition and health claims (NHC) register, a traditional-use framing, or a certificate on file.
2. An agent fleet running on GitHub Actions that produces a daily brief, TikTok/social content drafts, and PPC campaign drafts into an approval queue — at a cost the founder controls (Anthropic API usage, £25/day ad budget cap, campaigns paused by default).
3. A founder routine of **ten minutes a day** (see `docs/MORNING_REVIEW_GUIDE.md`) that keeps the whole system honest.

## 2. Scope

**In scope**

- Shopify theme (`shopify/theme/`) and store setup runbooks (`shopify/setup/`).
- Static brand site + dashboards on GitHub Pages (`index.html`, `product.html`, `pact.html`, `app.html`, `/dash/`).
- Agent fleet: master, TikTok "OmniFlash", social, PPC, compliance gate, metrics, publisher (`agents/`, `.github/workflows/`).
- Ads scaffolding for Google (Ads Editor CSV), Meta and TikTok (`ads/`), all paused-by-default.
- Documentation, analytics plan, SEO plan and operations SOPs (this suite: `docs/`, `analytics/`, `seo/`, `operations/`).

**Out of scope (deliberately)**

- Amazon or any marketplace layer (unlike the prior PureLifeNutra US build).
- Customer reviews of any kind — module disabled until real, verifiable reviews exist (DMCC Act 2024; see `docs/DECISIONS.md`).
- Any autonomous publishing or ad spend without a human approval step.
- The companion app build itself (its marketing surface is in scope; the app is a separate workstream).

## 3. Platform choice

| Layer | Choice | Why |
|---|---|---|
| Commerce | **Shopify** (Basic plan to start) | UK VAT/checkout handled, Shopify Payments, Shopify Subscriptions app for the £33.99 selling plan, mature theming. No custom checkout to maintain. |
| Agent runtime | **GitHub Actions only** | The build sandbox restricts egress; Actions gives scheduled cron, secrets management, environment protection gates, and full audit logs of every agent run — for free at this scale. No servers to patch. |
| Data store | **The repo itself** (`data/`) | Queue, approvals, briefs, metrics and state live as JSON/Markdown committed by a single-writer rule. Every change is a diff a human can read. |
| Dashboards | **GitHub Pages** (`/dash/`) | Static, free, already deployed via `.github/workflows/deploy-pages.yml`. The founder reviews from a phone. |
| LLM | **Anthropic API** (`@anthropic-ai/sdk`) | Structured outputs for machine-readable drafts; prompt caching on the stable brand-voice prefix keeps daily token cost low. |

## 4. Agent responsibilities (summary — full detail in `docs/AGENT_SKILL_REGISTRY.md`)

| Agent | Produces | Cadence |
|---|---|---|
| **Master** | Daily brief (`data/briefs/`), task fan-out, anomaly flags | Daily, early morning UK |
| **TikTok OmniFlash** | Scripted short-video concepts + captions → `data/queue/tiktok/` | Daily |
| **Social** | Instagram/organic drafts → `data/queue/social/` | Daily |
| **PPC** | Google Ads Editor CSVs (`data/ppc-export/`), Meta/TikTok campaign drafts — all paused | Weekly + on request |
| **Compliance gate** | PASS / NEEDS_REVIEW / REJECT verdict on every draft before it reaches the queue | Every draft |
| **Metrics** | Pulls platform metrics → `data/metrics/`, feeds the dashboard and the next brief | Daily |
| **Publisher** | Pushes **approved** items only, behind a GitHub environment gate | On approval ("Publish now") |

## 5. Deliverables map

| Area | Files |
|---|---|
| Plans & decisions | `docs/BUILD_PLAN.md`, `docs/ASSUMPTIONS.md`, `docs/DECISIONS.md` |
| Compliance | `docs/CLAIMS_MATRIX.md`, `docs/REJECTED_CLAIMS.md`, `docs/COMPLIANCE_CHECKLIST.md` |
| Brand & copy | `docs/BRAND_GUIDE.md`, `docs/COPY_BANK.md` |
| Operating the fleet | `docs/MORNING_REVIEW_GUIDE.md`, `docs/AGENT_SKILL_REGISTRY.md` |
| Research honesty | `docs/GITHUB_SKILL_SCOUT.md`, `docs/RESEARCH_NOTES.md`, `docs/OPEN_SOURCE_ATTRIBUTION.md`, `docs/DEPENDENCY_DECISIONS.md` |
| Analytics | `analytics/TRACKING_PLAN.md`, `analytics/events.json`, `analytics/utm-taxonomy.md`, `analytics/pixel-qa-checklist.md` |
| SEO | `seo/KEYWORD_MAP.md`, `seo/META_TITLES_DESCRIPTIONS.md`, `seo/SCHEMA_PLAN.md` |
| Operations | `operations/UK_FULFILLMENT_SOP.md`, `operations/RETURNS_SOP.md`, `operations/CUSTOMER_SUPPORT_SOP.md`, `operations/LAUNCH_OPERATIONS_CHECKLIST.md` |
| Theme & store | `shopify/theme/`, `shopify/setup/` (separate workstream) |
| Agents & ads | `agents/`, `ads/`, `.github/workflows/` (separate workstream) |

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Non-compliant claim reaches a live surface (ASA/CAP, GB NHC) | Medium | High — ASA ruling, ad account bans | Compliance gate on every draft; `docs/CLAIMS_MATRIX.md` is the only approved wording source; human approval before publish. |
| Fake/unverifiable review appears anywhere (DMCC Act 2024, CMA-enforceable) | Low | Severe — banned practice | Reviews module disabled; hard rule in brand voice; QA greps for testimonial patterns. |
| Ad spend runs away | Low | Medium | £25/day cap in agent config, all campaigns created **paused**, publisher behind GitHub environment approval. |
| Agent hallucinates a dose or price | Medium | High | `data/config/product-facts.json` is the single source of numbers; agents must read, never restate from memory; QA diff against the JSON. |
| Zinc claim used but zinc not confirmed in locked formula | Medium | Medium | Flagged TODO_VERIFY in `docs/ASSUMPTIONS.md`; zinc claims embargoed until formula confirms ≥15% NRV. |
| Shopify store not yet created — theme untestable end-to-end | Certain (today) | Medium | Runbooks written store-agnostically; `SHOPIFY_STORE_DOMAIN` placeholder swapped at store creation; launch checklist blocks go-live. |
| TikTok API app unaudited → posts limited to SELF_ONLY | High initially | Low | Documented in `docs/RESEARCH_NOTES.md`; drafts still queue; manual posting bridge until audit passes. |
| Prompt injection via fetched comments/trends | Medium | Medium | Brand-voice rule: external content is untrusted data, never instructions; agents wrap fetched text in data-only delimiters. |

## 7. QA approach

1. **Numbers audit** — every dose, price and count in every file must match `data/config/product-facts.json` exactly. Grep for `mg`, `µg`, `£`, `servings` and diff.
2. **Claims audit** — every marketing sentence maps to a row in `docs/CLAIMS_MATRIX.md`; anything in `docs/REJECTED_CLAIMS.md` appearing anywhere is a build failure.
3. **Review scan** — grep the entire repo for star ratings, "verified buyer", testimonial phrasing, `aggregateRating`. Must return nothing.
4. **Consent audit** — no pixel or analytics tag fires before consent in theme code; checklist in `analytics/pixel-qa-checklist.md`.
5. **Price coherence** — £39.99 / £33.99 / "from £1.62 a day" must agree everywhere (£33.99 ÷ 21 = £1.618 → £1.62; £39.99 ÷ 21 = £1.90).
6. **Dry-run the fleet** — each workflow run manually with `--dry-run`; confirm drafts land in `data/queue/`, nothing publishes, approvals file untouched.
7. Orchestrator writes `docs/QA_REPORT.md` and `docs/FINAL_REPORT.md` after this suite (not part of this workstream).
