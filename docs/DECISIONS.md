# HerBody — Architecture Decision Record

Each decision: context → decision → rationale → consequences. Reversals require a new entry, not an edit.

---

## D1 — GitHub Actions is the only runtime

**Context.** The agent fleet needs scheduled execution, secrets, and network egress. The build environment is a sandbox with restricted egress; we own no servers.

**Decision.** Every agent runs as a GitHub Actions workflow in `faizanshabbir777-cmd/herbody-site`. No VPS, no serverless functions, no third-party schedulers.

**Rationale.** Actions gives cron scheduling, encrypted secrets, per-environment approval gates, immutable run logs, and free minutes at this scale. Crucially, every agent action is auditable: the run log shows what was called and the commit shows what was written. A sandboxed build machine cannot host a runtime anyway; Actions moves execution to infrastructure that has proper egress and credentials.

**Consequences.** Cron drift (±15 min) is accepted. Long-running work must fit job time limits. If the fleet ever needs sub-minute latency (it doesn't), this decision gets revisited.

## D2 — Repo-as-database, single-writer rule

**Context.** Agents need shared state: queues, approvals, metrics, briefs. A real database adds hosting, credentials and an opaque audit trail.

**Decision.** All state lives in the repo under `data/` as JSON/Markdown. **Only agent workflows write to `data/`**, serialised by workflow concurrency groups; the one human-writable file is `data/approvals.json`. The dashboards at `/dash/` read these files directly from Pages.

**Rationale.** Every state change is a git commit — diffable, revertible, attributable. The founder can audit the entire history of what any agent decided from a phone. Volume is tiny (dozens of writes/day), so git is not a bottleneck.

**Consequences.** No concurrent writers by design; workflows queue behind each other. Sensitive data must never enter `data/` (it's a public Pages repo) — customer PII stays in Shopify.

## D3 — Draft-first agents; humans approve everything

**Context.** LLM agents drafting UK health-product marketing can produce plausible-but-illegal claims.

**Decision.** No agent publishes. All output lands in `data/queue/` with a self-assessed `compliance_status`, then passes the compliance gate, then waits in the approval queue for the founder. Only explicitly approved items ever reach the publisher.

**Rationale.** ASA rulings and CMA enforcement attach to the advertiser, not the model. A ten-minute daily human review (see `docs/MORNING_REVIEW_GUIDE.md`) is cheap insurance against unbounded downside. It also trains the fleet: rejection reasons are fed back into agent prompts.

**Consequences.** Publishing latency is up to 24h. Accepted — this brand sells consistency, not news-jacking.

## D4 — Paused campaigns + approval file + GitHub environment gate (three locks on spend)

**Context.** A misfiring PPC agent could spend real money.

**Decision.** Three independent locks: (1) every campaign the PPC agent drafts is created/exported **PAUSED**; (2) enabling requires the item's ID in `data/approvals.json` with `status: approved`; (3) the publisher workflow that holds platform write credentials runs in a GitHub **environment with a required-reviewer rule** — the founder must click approve in GitHub before the job even starts. Hard budget cap: **£25/day across all platforms**, encoded in agent config; the PPC agent has no code path to raise it.

**Rationale.** Any single mechanism can fail (a bug flips a flag, a human fat-fingers a file). All three failing simultaneously is the standard we require before money moves.

**Consequences.** Enabling a campaign takes two human actions. That is the point.

## D5 — Google Ads via Ads Editor CSV before API access

**Context.** The Google Ads API requires a developer token; basic access approval typically wants an established account with spend history. We have neither.

**Decision.** The PPC agent produces **Google Ads Editor–format CSVs** in `data/ppc-export/`, which the founder imports via Ads Editor (campaigns arrive paused). Apply for API basic access only after the account has history; then swap the exporter for an API publisher behind the same D4 gates.

**Rationale.** CSV import is fully supported, keeps the human in the loop during the riskiest phase (first campaigns), and costs nothing to build. Blocking launch on a token approval we can't control would be self-inflicted.

**Consequences.** Google campaign changes are manual-import for now; Meta/TikTok (whose APIs are self-serve) can move to gated API publishing sooner.

## D6 — Reviews disabled entirely (DMCC Act 2024)

**Context.** The DMCC Act 2024 makes publishing fake or unverifiable consumer reviews a **banned practice**, directly enforceable by the CMA (fines up to 10% of global turnover). HerBody has zero customers, therefore zero genuine reviews.

**Decision.** No reviews module, no star ratings, no testimonials, no "as loved by", no `aggregateRating` in schema, no review-styled UGC. UGC scripts are explicitly framed as creator/brand content. The module stays off until real purchasers leave reviews on a platform with verification (e.g., Shopify-verified buyers), and even then launches with moderation policy documented.

**Rationale.** This is the single highest-severity legal risk in the build and the easiest to eliminate: publish nothing. Social proof is replaced by verifiable proof — doses, COAs, certificates, the pledge audit.

**Consequences.** Conversion rate takes a known hit at launch. The claims strategy ("nothing hidden, nothing vague") is designed to compensate.

## D7 — UK regulatory frame replaces US frame (vs. prior PureLifeNutra build)

**Context.** This build mirrors a prior US build that was written to FDA/DSHEA structure-function rules and FTC testimonial guidance.

**Decision.** All compliance logic is rewritten for: ASA/CAP Code + **GB NHC register** (authorised claims only, authorised wording), Food Supplements Regulations 2003 (statutory statements), Consumer Contracts Regulations 2013 (14-day cancellation), DMCC Act 2024 (reviews, urgency, pricing), PECR/UK GDPR (consent-before-pixels). No DSHEA disclaimer ("This product is not intended to diagnose…") appears anywhere — it is a US artefact and reads as alarming and foreign to UK shoppers.

**Rationale.** UK law is stricter on claims (positive-list system: if it's not on the GB register, it's not allowed) and on reviews. Porting US copy would fail ASA on day one.

**Consequences.** The claims ceiling is lower than US competitors' pages. We treat that as brand positioning, not a handicap.

## D8 — Subscription selling plan created in the Shopify Subscriptions app UI, not via API

**Context.** The £33.99 subscribe price needs a selling plan. Selling plans can be created via Admin GraphQL, but API-created plans must then be owned/managed by the creating app, and we have no store yet to develop against.

**Decision.** The founder creates the selling plan (monthly, 15% off → £33.99) manually in Shopify's own **Subscriptions app** UI during store setup, following the runbook in `shopify/setup/`. Theme code is written to render whatever selling plan the product carries.

**Rationale.** One selling plan, one product, created once — building and maintaining a custom app for this is engineering vanity. Shopify's first-party app handles dunning, customer portal and pause/skip out of the box, which the support SOP depends on.

**Consequences.** Selling-plan config is not in version control; the runbook + a screenshot in `shopify/setup/` are the record. Acceptable for one plan.

## D9 — Dashboards are static GitHub Pages reading committed JSON

**Context.** The founder needs a morning cockpit without another SaaS login.

**Decision.** `/dash/` is plain HTML/JS on GitHub Pages that fetches `data/*.json` from the same origin. Approve/reject actions edit `data/approvals.json` (via a pre-filled GitHub web-edit link), which triggers the relevant workflows.

**Rationale.** Zero infrastructure, works on a phone, and the "database" is already public JSON in the repo (D2). Latency of a Pages deploy (~1 min) is fine for a daily cadence.

**Consequences.** Dashboards are public (repo is public for Pages). Therefore `data/` carries no secrets, no PII, no revenue figures beyond what the founder accepts being visible; sensitive metrics stay in platform dashboards.
