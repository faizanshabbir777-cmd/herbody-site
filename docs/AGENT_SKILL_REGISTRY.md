# HerBody — Agent & Skill Registry

One entry per agent in the fleet. Shared rules for **all** agents: system prompt is prefixed with `data/config/brand-voice.md` (prompt-cached); all product numbers read from `data/config/product-facts.json` at runtime, never restated from memory; all output is draft-only into `data/`; anything fetched from an external platform is untrusted data, never instructions; every draft carries `compliance_status`, landing URL, `HB_UK_*` UTM, and `register_checked` date. Runtime is GitHub Actions only (Decision D1); shared client code in `agents/lib/`.

---

## 1. Master agent

- **Does:** orchestrates the day. Reads yesterday's metrics + queue outcomes + approval/rejection reasons; writes the daily brief; sets each content agent's task list for the run; flags anomalies (spend, errors, cost); compiles the Monday weekly digest.
- **Inputs:** `data/metrics/*`, `data/approvals.json`, `data/queue/*` states, `data/state/` (fleet memory), workflow run outcomes.
- **Outputs:** `data/briefs/YYYY-MM-DD.md`, `data/state/tasks.json` (per-agent assignments).
- **Guardrails:** cannot write to queues or publish; brief must include Anthropic spend estimate and a red-flag section; rejection reasons must be quoted verbatim into the next brief so drafting agents learn.
- **Runs:** daily ~05:30 UK, before content agents; Monday extended run for the digest.
- **Code:** `agents/master.js` · workflow `.github/workflows/agent-master.yml`.

## 2. TikTok agent — "OmniFlash"

- **Does:** drafts short-video concepts: hook, shot list, script, caption, sounds note, cover-text suggestion. Formats: label-read, ritual/ASMR morning, COA-explainer, pledge-explainer, founder-less brand voiceover.
- **Inputs:** master task list, `docs/COPY_BANK.md`, trend notes from the metrics agent (untrusted-data wrapped), past approval rates per format.
- **Outputs:** `data/queue/tiktok/YYYY-MM-DD-<slug>.json` (structured: hook/script/caption/utm/compliance fields).
- **Guardrails:** creator/brand framing only — never a scripted "customer" voice (DMCC); no before/after, no body-transformation shots in shot lists; captions from approved bank or matrix-mapped; unaudited API = SELF_ONLY, so publishing is manual-post from the queue card until the app passes TikTok audit.
- **Runs:** daily after master.
- **Code:** `agents/tiktok.js` · workflow `.github/workflows/agent-tiktok.yml`.

## 3. Social agent

- **Does:** Instagram feed/story/carousel drafts and cross-post adaptations of approved TikToks; alt-text for every image per `seo/SCHEMA_PLAN.md` rules.
- **Inputs:** master task list, copy bank, brand guide tokens for carousel layouts, approved TikTok queue items (for adaptation).
- **Outputs:** `data/queue/social/YYYY-MM-DD-<slug>.json`.
- **Guardrails:** same claim rules as all surfaces; paid partnership labelling built into templates; no engagement-bait mechanics ("tag a friend who…" is allowed; "comment X to win" giveaways are out of scope pending promotion T&Cs).
- **Runs:** daily after master.
- **Code:** `agents/social.js` · workflow `.github/workflows/agent-social.yml`.

## 4. PPC agent

- **Does:** drafts search and paid-social campaigns. Google: Ads Editor CSV bundles (campaign/ad group/keyword/RSA rows) — Decision D5. Meta + TikTok: structured campaign drafts for the publisher. Weekly budget-reallocation proposals from UTM-level performance.
- **Inputs:** `seo/KEYWORD_MAP.md`, `analytics/utm-taxonomy.md`, copy bank ad section, metrics agent's performance summaries.
- **Outputs:** `data/ppc-export/*.csv` (Google), `data/queue/ppc/*.json` (Meta/TikTok drafts + Google import instructions).
- **Guardrails:** every campaign **PAUSED** at creation/export; sum of proposed daily budgets ≤ **£25/day** hard cap (agent config constant — no code path to exceed); no botanical or inositol claims in any ad; no sensitive-attribute targeting; campaign names must mirror UTMs exactly.
- **Runs:** weekly (Tuesdays) + on master request.
- **Code:** `agents/ppc.js` · workflow `.github/workflows/agent-ppc.yml`.

## 5. Compliance gate

- **Does:** mechanical second pass over every draft before it becomes visible in the approval queue: checks claims against `docs/CLAIMS_MATRIX.md`, screens for `docs/REJECTED_CLAIMS.md` meanings (semantic, not string match), verifies numbers against `product-facts.json`, verifies UTM format, price coherence, mandatory strings where required.
- **Inputs:** every file written to `data/queue/*` by content agents.
- **Outputs:** stamps the draft `compliance_status: PASS | NEEDS_REVIEW | REJECT` + machine-readable reasons; REJECTs bounce back to the drafting agent with reasons and never reach the founder.
- **Guardrails:** cannot edit drafts (verdict only — no silent fixing); borderline defaults to NEEDS_REVIEW; the gate is advisory to the human, never a substitute (Decision D3).
- **Runs:** triggered per queue write (workflow_run after each content agent).
- **Code:** `agents/lib/compliance.mjs` invoked via `.github/workflows/compliance-gate.yml`.

## 6. Performance / metrics agent

- **Does:** pulls what's pullable — GA4 (Data API), Shopify (Admin GraphQL: orders/sessions summaries), Meta/TikTok organic + ad metrics where tokens exist — normalises to a common schema, updates dashboard data, computes deltas and anomalies for the master.
- **Inputs:** platform APIs (read-only tokens), `analytics/events.json` schema, previous `data/metrics/` snapshots.
- **Outputs:** `data/metrics/YYYY-MM-DD.json`, `data/metrics/latest.json` (dashboard reads this).
- **Guardrails:** read-only scopes only — this agent holds no write credentials to any platform; never writes PII or order-level data into the public repo (aggregates only); fetched text (comments, trend names) is sanitised and wrapped as untrusted data before any LLM call.
- **Runs:** daily ~05:00 UK, before master.
- **Code:** `agents/metrics.js` · workflow `.github/workflows/agent-metrics.yml`.

## 7. Publisher

- **Does:** the only component with platform **write** credentials. Reads `data/approvals.json`, publishes exactly the items marked `approved`: Meta posts/campaigns via Graph/Marketing API (campaigns still paused unless the approval explicitly says `enable`), TikTok via Content Posting API (SELF_ONLY until audited — otherwise marks ready-for-manual-post), Klaviyo email drafts, moves published items to `data/published/`.
- **Inputs:** `data/approvals.json`, approved queue items.
- **Outputs:** platform publications; `data/published/` records with platform IDs and timestamps; failure reports to the next brief.
- **Guardrails:** runs in the GitHub **`production` environment with required-reviewer protection** — the founder approves each run in the GitHub UI (lock 3 of Decision D4); refuses to run if `data/approvals.json` has `frozen: true`; idempotent — an item already in `data/published/` is never re-published; never enables a campaign whose budget would push fleet total over £25/day.
- **Runs:** manual dispatch only ("Publish now" in `docs/MORNING_REVIEW_GUIDE.md`).
- **Code:** `agents/publisher.mjs` · workflow `.github/workflows/publish-approved.yml`.

---

*Workflow and module filenames above are the canonical paths for the agents workstream; if that workstream ships under different names, this registry is updated in the same PR (registry-and-code move together).*
