# QA Report — HerBody Shopify + Agents + Dashboards build

**Protocol:** build → QA → fix → re-QA (PLN loop). **Final status: PASS** (iteration 2 of max 8).

## Iteration log

| Iter | Issues found | Severity | Fixes | Status |
|---|---|---|---|---|
| 1 | (a) 3 banned-phrase grep hits; (b) 2 review-content hits; (c) dashboards "never fetch" data paths | review | (a) Confirmed false positives — guardrail docs (brand-voice, creator brief, growth pack) quote banned phrases *in order to ban them*; harness now scopes the sweep to customer-facing surfaces only. (b) Confirmed safe — hits are the DMCC warning text inside the default-OFF reviews gate and locale strings that only render inside that gate. (c) Harness bug — dash.js builds paths via a helper; check now matches path fragments. | fixed |
| 2 | none | — | — | **PASS** |

## Checks run (all green at iteration 2)

- **A. Build QA** — 50+ required files present across theme/agents/workflows/dash/docs/marketing/analytics/seo/operations/ads.
- **B. JS syntax** — `node --check` on all agent libs, agents, store-setup.mjs, dash.js.
- **C. JSON validity** — every .json in data/, theme config/locales, analytics, marketing, ads, approvals.
- **D. Workflow YAML** — 7 workflows parse.
- **E. Ads safety** — every campaign YAML: status PAUSED at campaign/ad-set/ad level, no ACTIVE anywhere, budgets ≤ £25/day.
- **F. Compliance sweep** — no banned claims (disease/testosterone/fat-burn/FDA/clinically-proven-product/hormone-outcome/fake-urgency) in theme, dash, or ads copy.
- **G. DMCC fake-review guard** — no review-like content outside the default-OFF gated module; zero testimonials in 30 UGC scripts (creator-voice only); Klaviyo review-request email hard-gated OFF.
- **H. Secrets scan** — no token patterns (shpat_/shptka_/sk-ant-/github_pat_/AKIA) anywhere; no .env; .env.example only.
- **I. Liquid sanity** — every `render`/`section` reference resolves to an existing file; all template JSON section types have section files.
- **J. Dashboards** — all four pages fetch the real data contracts (queue/index, approvals, metrics/latest, briefs, budgets).

## Live smoke tests

- `store-setup.mjs` DRY_RUN: prints full mutation payloads (productSet with locked v14 formula + authorised claim wording), exits 0, token never printed.
- Agent libs load under Node 22; `putDraft` round-trips a queue item + index entry; platform wrappers correctly report `available:false` with no secrets set (graceful draft-mode).
- Dashboards browser-tested by the dash workstream (headless Chromium): all pages render populated + empty states, approve flow verified against a mocked GitHub API incl. 409-retry.
- Marketing compliance self-review: 6 borderline lines rejected on-record (see `ads/compliance/rejected-ads.md`).

## Known limitations (not defects)

1. Theme visual QA on a real store pending first `shopify-theme-deploy` run (Theme Check runs in that workflow; sandbox has no Shopify access).
2. TikTok auto-posting lands SELF_ONLY until the developer-app audit passes (documented, by design).
3. IG API posting requires hosted media URLs; until media hosting is set up, approved IG items resolve to ready-manual.
4. Google Ads API push awaits developer-token approval; Ads Editor CSV is the operational path.
5. `agents/package-lock.json` generated under Node 22 (Actions pins Node 20 — compatible).
