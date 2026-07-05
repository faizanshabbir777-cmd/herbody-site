# Dependency Decisions

Policy: **every dependency is a liability with a changelog.** This build runs unattended on a schedule with credentials in scope — the smaller the supply-chain surface, the smaller the audit. Default answer to "should we add a package?" is no.

## What we installed

| Dependency | Version policy | Why it's worth it |
|---|---|---|
| `@anthropic-ai/sdk` | Pinned exact version in `package.json`; bumped deliberately, never `latest` | Official client for the API every agent depends on. Hand-rolling auth, retries, streaming and structured-output handling against the raw HTTP API would be more code to audit than the SDK itself. MIT-licensed, first-party maintained. |

That is the whole list. Node's built-ins cover the rest: `fetch` (Meta/TikTok/Shopify/GA4 HTTP calls), `fs`/`path` (repo-as-database reads/writes), `crypto` (event IDs, hashing for CAPI email matching when phase 2 lands).

## What we deliberately did NOT install, and why

| Rejected | Reason |
|---|---|
| Agent frameworks (LangChain, LlamaIndex, CrewAI, …) | Our orchestration is "read JSON, call Claude, write JSON, commit". A framework would obscure exactly the thing this build must keep legible: what every agent did and why. The draft-first/approval architecture *is* the framework. |
| Meta Business SDK / TikTok SDK / `googleapis` | Each is a large dependency tree for what amounts to a handful of REST calls with a bearer token. Plain `fetch` + our own thin wrappers in `agents/lib/` are auditable in one sitting. Google Ads has no API path yet at all (Decision D5 — Ads Editor CSV). |
| Shopify SDK / theme frameworks | Theme is vanilla Liquid/CSS/JS by design (no build step, matches Dawn's philosophy without its code). Metrics agent's Admin GraphQL calls are two queries via `fetch`. |
| CSV libraries | Google Ads Editor CSVs are written by a 30-line serialiser with explicit escaping — the format is documented and stable, and owning it means import failures are debuggable. |
| Databases / ORMs / queue systems | Repo-as-database (Decision D2). Git is the database, diffs are the audit log. |
| Test/build tooling beyond Node's built-in runner | `node --test` covers the agent unit tests; no transpilers, no bundlers — `.mjs` runs as written on Actions. |
| Analytics/tag-manager containers (GTM) | Direct, hand-placed pixel snippets behind the consent gate. GTM adds a third-party script and an opaque config layer exactly where PECR requires us to be able to prove what fires when. |

## Maintenance rules

1. `package-lock.json` is committed; Actions installs with `npm ci`.
2. Dependabot security alerts on; version bumps land as PRs the founder merges — never auto-merge.
3. Adding any new dependency requires a row in this file **in the same PR**, stating what problem it solves that ~50 lines of our own code could not.
