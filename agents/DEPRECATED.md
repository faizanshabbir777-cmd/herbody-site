# ⚠️ Retired — never went live

This fleet is **retired**. It never ran in production: the scheduled
workflows were secret-gated, every `data/state/*.json` file shows
`last_run: null`, and there are no bot commits anywhere in this repo's
history.

The shared multi-tenant engine at
**[faizanshabbir777-cmd/GrowthEnginge](https://github.com/faizanshabbir777-cmd/GrowthEnginge)**
is HerBody's growth-automation **system of record from day one** (tenant
`brands/herbody`). The planned shadow-mode cutover (`docs/SHADOW_CUTOVER.md`
in the engine repo) was superseded with founder approval: there was nothing
live here to diff against or cut over from, so the fleet moved straight to
retired instead of running a shadow period.

The scheduled workflows that drove this fleet
(`agent-fleet.yml`, `weekly-strategy.yml`, `publish-approved.yml`,
`compliance-gate.yml`, `ppc-push.yml`) have been **deleted** from
`.github/workflows/`. They're recoverable from git history if ever needed.

**This code is kept read-only as a porting reference.** The following
capabilities have not yet been ported to the engine and remain here only so
they can be consulted while porting:

- the Google Ads PPC push (`ppc.js`, `ads-push.js`)
- the Higgsfield generation client (`video.js` / `image.js`)
- the Shopify Files upload in `collect-pending.js`

**Do not run or extend this code.** New capabilities go into the engine; this
brand repo's only live concern is the storefront (Shopify theme under
`shopify/theme/`, migration runbook `shopify/MIGRATION.md`) and brand docs.

**Planned removal:** this directory will be deleted once (a) the engine
fleet has run green for HerBody for roughly 30 days, **and** (b) the
reference capabilities listed above have been ported to the engine.
