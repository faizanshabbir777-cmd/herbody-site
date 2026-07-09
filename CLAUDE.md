# HerBody — working in this repo

This repo is the **storefront**: the Shopify OS 2.0 theme under
`shopify/theme/` (cutover runbook: `shopify/MIGRATION.md`; static site retires
after DNS cutover). The legacy agent fleet under `agents/` is RETIRED — it
never went live, its scheduled workflows have been deleted (recoverable from
git history), and it is kept read-only as a porting reference only (see
`agents/DEPRECATED.md`). The shared engine
(github.com/faizanshabbir777-cmd/GrowthEnginge, tenant `brands/herbody`) is
the system of record for growth automation. This repo's only live concern is
the storefront (`shopify/theme/`, cutover runbook `shopify/MIGRATION.md`).
Compliance rails are hard: UK ASA/DMCC — no fake reviews, no medical claims,
no fake urgency; drafts-first, campaigns always PAUSED.

## Operating model (Advisor/Orchestrator — applies to every session)

Two cost patterns, chosen by which model runs THIS session's main loop:

**Orchestrator (expensive main loop — e.g. Fable):** the main loop plans,
decides, and synthesizes; it does not bulk-read raw files or grind mechanical
work. Delegate to `worker` subagents (Sonnet tier): bulk reading/exploration,
repetitive multi-file edits, theme/liquid sweeps, running the test suite,
evidence collection. Launch independent workers IN PARALLEL in one message and
consume their conclusions — don't re-read what a worker already summarized.

**Advisor (cheap main loop — e.g. Sonnet):** execute directly, and on a HARD
decision call the `advisor` agent with the full problem context; it returns a
plan/verdict only (never edits); keep executing on its plan.

**"Hard" means:** irreversible or externally-visible actions (storefront
deploys, DNS cutover steps), cross-cutting design choices, anything touching
the compliance rails, or a bug that survived two fix attempts.

**Fallback:** if the Fable tier is unavailable, use the next-best available
tier for the advisor — today that is Opus 4.8 (`model: "opus"` on the Agent
call).

**Token hygiene:** keep each subagent prompt self-contained; one worker per
independent concern; workers never push, publish, comment, or spend —
externally-visible actions stay in the main loop.
