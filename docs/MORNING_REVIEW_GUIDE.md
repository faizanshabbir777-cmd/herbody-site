# HerBody — Morning Review Guide

The founder's daily operating manual. Target: **ten minutes with coffee**. The fleet drafted overnight; nothing it drafted can publish or spend until you act.

---

## The 10-minute routine

### Minute 0–2 — Open the dashboard, read the brief

1. Open **`/dash/`** (bookmark: `https://faizanshabbir777-cmd.github.io/herbody-site/dash/`).
2. Read the **daily brief** (from `data/briefs/`, written by the master agent): yesterday's numbers, anomalies, what each agent drafted, what needs you.
3. Glance at the four status tiles: **Queue** (items awaiting review) · **Spend** (must show £0.00 until you've enabled campaigns; cap £25/day) · **Errors** (failed workflow runs) · **Metrics** (orders, sessions, follower deltas).

**Red flags that override the routine:** spend > £0 with nothing enabled, a published item you don't remember approving, an error streak on the same workflow ≥3 days. Any of these → jump to *Emergency pause* below, investigate after.

### Minute 2–8 — Review the queue

For each item in `data/queue/{tiktok,social,ppc}/` (surfaced as cards on the dashboard):

1. **Read it aloud once.** If it doesn't sound like a smart friend talking, reject.
2. **Check the compliance line.** Every card shows `compliance_status`, the landing URL, the UTM string, and `register_checked` date. `NEEDS_REVIEW` items get extra scrutiny against `docs/CLAIMS_MATRIX.md`; when unsure, reject — rejection is free, an ASA ruling isn't.
3. **Spot-check one number** against what you know: price, dose, servings. One wrong number → reject the whole item (it signals the agent hallucinated).
4. **Decide:** the dashboard's Approve/Reject buttons open a pre-filled edit to `data/approvals.json` — commit it. Rejections need a one-line reason; the master agent feeds reasons back into tomorrow's drafting.

Approving in `data/approvals.json` **does not publish anything**. It marks the item eligible.

### Minute 8–10 — Publish (or don't)

- Run **"Publish now"** only when you want approved items to go out: GitHub → Actions → `publish` workflow → *Run workflow*. The job pauses at the **environment gate** — GitHub asks you to approve the deployment. That's lock number three; click approve and only `approved` items publish.
- **When to run it:** organic social — same morning is fine. **PPC enable actions — never same-minute**; re-read the campaign card once more, confirm total daily budget across everything enabled stays ≤ £25, then run.
- TikTok note: while our API app is unaudited, "publishing" a TikTok means the workflow marks it ready and you post it manually from the queue card (copy button provided). Two minutes, at most.

## Weekly strategy review (Mondays, ~30 minutes)

- Read the master agent's **weekly digest** (in `data/briefs/`): spend vs. results per channel, UTM-level performance from GA4, queue approval rate per agent.
- Kill or scale: pause any ad set with a week of spend and no add-to-carts; approve budget re-allocation drafts (still within £25/day).
- Review rejected-item reasons — if an agent keeps making the same mistake, its prompt needs a line added (file an issue on the repo; don't hot-edit prompts mid-week).
- Check `docs/ASSUMPTIONS.md` TODO_VERIFY list — knock one item down per week.
- Skim the CMA/ASA news search the master agent includes in the Monday brief for anything touching supplements, reviews or wellness advertising.

## Emergency pause — full-stop procedure

Work top to bottom; each step is independent, do as many as the situation needs. Total time: under five minutes.

**1. Stop spend (per platform):**
- Google Ads: Campaigns → select all → Pause. (Faster than any tooling we own.)
- Meta Ads Manager: toggle campaign off at campaign level.
- TikTok Ads Manager: suspend at campaign level.

**2. Stop the fleet:**
- GitHub → repo → Actions → select each agent workflow (`master`, `tiktok`, `social`, `ppc`, `publisher`, `metrics`) → "⋯" menu → **Disable workflow**. Disabled workflows cannot run on schedule or manually.

**3. Revoke credentials (if you suspect compromise, not just malfunction):**
- GitHub → repo → Settings → Secrets and variables → Actions → delete `ANTHROPIC_API_KEY`, `META_ACCESS_TOKEN`, `TIKTOK_ACCESS_TOKEN`, and any Google credentials. Workflows fail safely without them.
- Then rotate at source: Anthropic Console (revoke key), Meta developer app (invalidate token), TikTok developer portal (revoke), Google (revoke OAuth refresh token).

**4. Freeze the queue:** commit `{"frozen": true}` at the top of `data/approvals.json` — the publisher refuses to run while the freeze flag is set.

**5. Afterwards:** write what happened in the repo (an issue titled `incident: YYYY-MM-DD`), fix, re-enable workflows one at a time starting with `metrics` (read-only), watching one full cycle each.

## What you never have to do

- Write posts, captions or campaigns from scratch — reject with a reason and the fleet redrafts.
- Log into the Anthropic console daily — cost shows in the brief; alarm threshold is set there once.
- Trust an agent's compliance self-assessment — that's why the routine exists.
