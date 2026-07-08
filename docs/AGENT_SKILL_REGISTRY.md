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

## 2. TikTok agent — "OmniFlash" (EDITOR layer)

- **Does:** the TikTok channel's editorial layer. Reviews every TikTok-bound draft the producers queued today: sharpens the first-2-seconds hook, tightens the caption, sets the posting slot, keeps the calendar, and stamps `payload.editorial` with a verdict (`approved` / `needs_work` + notes). The autonomy policy requires this verdict before any TikTok item auto-posts. **Fallback:** when the day's TikTok queue is empty, drafts 1–2 founder-filmable scripts itself (no media generation — the video producer is the fleet's only renderer).
- **Inputs:** today's TikTok-bound queue items, strategy, creative learnings digest, metrics + trends (untrusted-data wrapped).
- **Outputs:** editorial stamps on other agents' queue items (compliance-gate stamp invalidated when it edits copy, so the gate re-checks); fallback drafts in `data/queue/tiktok/`.
- **Guardrails:** creator/brand framing only — never a scripted "customer" voice (DMCC); no before/after; verdicts only downgrade autonomy eligibility, never bypass compliance or visual QA; unaudited API = SELF_ONLY, so publishing is manual-post until the app passes TikTok audit.
- **Runs:** daily AFTER the producers (social → video → image → OmniFlash).
- **Code:** `agents/tiktok.js`.

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

## 7. Trends collector

- **Does:** dependency-free competitor/trend ingestion. Reads allowlisted sources from `data/config/competitors.json` and founder notes from `data/trends/manual/`, normalises them into canonical trend records, scores relevance against brand keywords, hard-rejects banned themes (diet-culture, body-checking, before/after, medical-adjacent, testimonial fabrication, fake urgency, licensing-risk sounds).
- **Inputs:** `data/config/competitors.json`, `data/trends/manual/*.json`, allowlisted public URLs only.
- **Outputs:** `data/trends/YYYY-MM-DD.json`, `data/trends/latest.json` (relevant + rejected with reasons).
- **Guardrails:** never fetches unlisted URLs, never scrapes logged-in pages from CI; everything collected is untrusted DATA — downstream agents receive it wrapped in `untrusted()`. No LLM call.
- **Runs:** daily, after metrics, before the content agents.
- **Code:** `agents/trends.js` + `agents/lib/trends.js`.

## 8. Video producer

- **Does:** turns relevant trend records + strategy + creative-performance labels into full video production packs (hook, shot list, voiceover, on-screen text, caption, hashtags, CTA, generation prompt) and — when the autonomy mode allows — generates the actual asset through the shared creative producer.
- **Inputs:** `data/trends/latest.json` (untrusted-wrapped), `data/config/strategy.json`, `data/config/product-assets.json`, `data/state/creative-performance.json`.
- **Outputs:** `data/queue/video/YYYY-MM-DD-<slug>.json` with product spec version, asset IDs, generation prompt, media URL (if generated), `visual_qa_status`, compliance fields.
- **Guardrails:** the **product gate** — every concept must visibly depict the real product per `data/config/product-assets.json`; if neither approved references nor a complete visual spec exist, the agent queues a blocked checklist and generates NOTHING. Generated media is always `visual_qa_status: needs_review` until a human passes it. Media files never enter the repo — URLs only.
- **Runs:** daily after tiktok/social.
- **Code:** `agents/video.js` + `agents/lib/creative-requests.js` + `agents/lib/creative-gen.js` + `agents/lib/product-assets.js`.

## 9. Image producer

- **Does:** static creative — Instagram feed/stories/carousel frames, ad stills, video thumbnails, TikTok Shop product images — with prompts, on-image text, captions, alt text. Same generation path and product gate as the video producer.
- **Inputs/Outputs:** as video producer, queued to `data/queue/image/`.
- **Guardrails:** identical product gate + visual QA rules; alt text mandatory; real label artwork composited before publish (never an AI-invented label).
- **Runs:** daily after the video producer.
- **Code:** `agents/image.js`.

## 10. Creative performance

- **Does:** mechanical winner selection. Labels every published creative `winner / promising / fatigue / reject` against `data/config/autonomy.json → winner_thresholds`, with reasons and recommended next actions. Feedback for the producers; promotion candidates for paid.
- **Inputs:** `data/metrics/creative/latest.json` (organic per-post metrics joined to published queue items).
- **Outputs:** `data/state/creative-performance.json`.
- **Guardrails:** no LLM call; thresholds only from config; labels never publish or spend anything by themselves.
- **Runs:** daily after the producers, before PPC/paid.
- **Code:** `agents/creative-performance.js` + `agents/lib/performance.js`.

## 11. Paid growth (winner scaling)

- **Does:** turns winning organic creatives into PAUSED paid test campaign drafts (Meta/TikTok/Google) to scale the DTC website; sweeps live ad rows for stop-loss breaches and flags them.
- **Inputs:** `data/state/creative-performance.json`, `data/config/autonomy.json`, `data/config/budgets.json`, `data/metrics/latest.json`, `data/config/product-assets.json`.
- **Outputs:** `data/queue/paid/*.json` (campaign drafts, always PAUSED), `data/state/paid-growth-latest.json`.
- **Guardrails:** never promotes creative without visual-QA pass + compliance PASS; budgets clamped by `canAutoScale` (fleet cap, max increase %); `auto_scale_eligible` is metadata only — nothing unpauses without the publisher flow/human; stop-loss flags require human action to pause.
- **Runs:** daily after creative-performance.
- **Code:** `agents/paid-growth.js`.

## 12. TikTok Shop ads (gated)

- **Does:** once `data/config/product-assets.json → tiktok_shop.approved` is true, drafts PAUSED TikTok Shop ad campaigns from winning TikTok creatives. Until then it only maintains the readiness checklist — all paid traffic routes to the website PDP.
- **Outputs:** `data/state/tiktok-shop-readiness.json`; `data/queue/paid/*.json` once approved.
- **Guardrails:** hard-gated on Shop approval flag; same budget/QA/compliance gates as paid growth.
- **Runs:** daily after paid growth.
- **Code:** `agents/tiktok-shop-ads.js`.

## 13. Autonomy policy (cross-cutting)

- **What:** `data/config/autonomy.json` — mode ladder `draft_only < auto_generate < auto_post_organic < auto_scale_ads`, `kill_switch`, per-platform daily post caps (UK day boundary), visual-QA/compliance/editorial requirements, `allow_self_only_tiktok_posts` (off until the TikTok app audit passes), ad budget caps, LLM daily budget, stop-loss and winner thresholds (adaptive to the account's own median engagement; revenue-attributed creatives are winners regardless of engagement).
- **Enforced by:** `agents/lib/autonomy.js` in the producers (generate?), publisher (auto-post?) and paid agents (auto-scale?). `kill_switch: true` halts every automatic action instantly — toggleable from the Approvals dashboard.
- **Publisher autonomy path:** in `auto_post_organic`+, the publisher may post organic items that pass ALL gates — human compliance `PASS` **and** mechanical compliance-gate `PASS`, human visual-QA `pass` in `data/visual-qa.json`, allowed platform, scheduled today, hosted media URL from an allowlisted host, cap not reached — without a queue approval; everything else still requires `data/approvals.json`. Ready-manual outcomes are never marked published by the autonomy path.
- **Visual QA:** producers stamp generated media `needs_review`; an optional Claude-vision pre-check (`agents/lib/vision-qa.js`) can auto-FAIL obvious product substitutions but can never auto-pass; the founder's pass/fail verdict is written by the dashboard to `data/visual-qa.json` **with a media-URL fingerprint** — a pass never covers a newer render.

## 13c. Doctor & Notify (ops surface)

- **Doctor** (`agents/doctor.js`): presence-only integration check, runs first — `data/state/integrations.json` shows live vs degraded platforms on the dashboard.
- **Notify** (`agents/notify.js`): runs last; collects critical events (kill switch, stop-loss flags, blocked product spec, compliance REJECTs, failed renders, LLM budget breach) into ONE GitHub issue labelled `fleet-alert`. Degrades to log-only without a token.
- **Housekeeping:** collect-pending archives decided queue items older than 30 days to `data/archive/queue/`; per-day Anthropic usage (+£ estimate) accrues in `data/state/anthropic-usage.json`.

## 13a. Collect-pending

- **Does:** start-of-fleet sweep that finalises provider render jobs that outlived a previous run (`media_status: "pending"` + `provider_job_id`) and resolves Shopify Files CDN URLs still processing. Runs the vision pre-check on newly collected renders.
- **Code:** `agents/collect-pending.js` + `checkJob` in `agents/lib/creative-gen.js`.

## 13b. Ads push (the only campaign-creation path)

- **Does:** pushes human-approved paid queue drafts to Meta/TikTok as **PAUSED** campaigns (campaign level only — ad groups/creatives finished by a human in Ads Manager). Budgets re-clamped through the autonomy policy at push time.
- **Gates:** manual workflow dispatch + GitHub `ads-production` environment + `approvals/ADS_LAUNCH_APPROVAL.json` + per-item approval in `data/approvals.json` + kill switch.
- **Code:** `agents/ads-push.js` · workflow `.github/workflows/ppc-push.yml`.

## 14. Publisher

- **Does:** the only component with platform **write** credentials. Reads `data/approvals.json`, publishes the items marked `approved`: Meta posts/campaigns via Graph/Marketing API (campaigns still paused unless the approval explicitly says `enable`), TikTok via Content Posting API (SELF_ONLY until audited — otherwise marks ready-for-manual-post), Klaviyo email drafts, moves published items to `data/published/`. In autonomy mode `auto_post_organic`+ it additionally publishes organic items that pass every policy gate (see §13).
- **Inputs:** `data/approvals.json`, approved queue items.
- **Outputs:** platform publications; `data/published/` records with platform IDs and timestamps; failure reports to the next brief.
- **Guardrails:** runs in the GitHub **`production` environment with required-reviewer protection** — the founder approves each run in the GitHub UI (lock 3 of Decision D4); refuses to run if `data/approvals.json` has `frozen: true`; idempotent — an item already in `data/published/` is never re-published; never enables a campaign whose budget would push fleet total over £25/day.
- **Runs:** manual dispatch only ("Publish now" in `docs/MORNING_REVIEW_GUIDE.md`).
- **Code:** `agents/publisher.mjs` · workflow `.github/workflows/publish-approved.yml`.

---

*Workflow and module filenames above are the canonical paths for the agents workstream; if that workstream ships under different names, this registry is updated in the same PR (registry-and-code move together).*
