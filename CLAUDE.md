# HerBody — working in this repo

This repo is the **storefront + legacy fleet**: the Shopify OS 2.0 theme under
`shopify/theme/` (cutover runbook: `shopify/MIGRATION.md`; static site retires
after DNS cutover) and the legacy agent fleet under `agents/`, which REMAINS
THE SYSTEM OF RECORD until the shadow-mode cutover to the shared engine
completes (github.com/faizanshabbir777-cmd/GrowthEnginge, tenant
`brands/herbody` — see `agents/DEPRECATED.md`). Do not extend the legacy fleet
or disable its scheduled workflows until the cutover runbook says so.
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

**"Hard" means:** irreversible or externally-visible actions (posting, deploys,
cutover steps), cross-cutting design choices, anything touching the compliance
rails or the fleet's gates/kill-switch, or a bug that survived two fix attempts.

**Fallback:** if the Fable tier is unavailable, use the next-best available
tier for the advisor — today that is Opus 4.8 (`model: "opus"` on the Agent
call).

**Token hygiene:** keep each subagent prompt self-contained; one worker per
independent concern; workers never push, publish, comment, or spend —
externally-visible actions stay in the main loop.
