# ⚠️ Superseded by the shared growth engine (cutover in progress)

This fleet's capabilities have been merged into the shared multi-tenant
engine at
**[faizanshabbir777-cmd/GrowthEnginge](https://github.com/faizanshabbir777-cmd/GrowthEnginge)**,
where HerBody runs as the tenant `brands/herbody`.

**This legacy fleet remains the SYSTEM OF RECORD until the shadow-mode
cutover completes** (see `docs/SHADOW_CUTOVER.md` in the engine repo): the
engine runs in shadow beside this fleet, decisions are diffed daily, and
workflows cut over one at a time only when the diffs run clean. Do not
disable the scheduled workflows here until the runbook says so.

**Do not extend the code here.** New capabilities go into the engine; this
brand repo keeps the storefront (Shopify theme under `shopify/theme/`,
migration runbook in `shopify/MIGRATION.md`) and brand docs. After the final
workflow cuts over and runs green for a week, this directory will be removed.
