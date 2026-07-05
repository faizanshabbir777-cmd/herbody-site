# ads/compliance — how this directory works

- `ad-claims-matrix.csv` — every distinct claim used anywhere in the ads pack → basis → risk → status. New copy may only use claims listed as `approved` (respecting their conditions). New claims get a row **before** the copy is drafted.
- `approved-ads.md` — the agent-level compliance pass over the whole pack.
- `rejected-ads.md` — lines that failed, with reasons. Never redraft anything in there.

## The approval file (read this, agents)

`approvals/ADS_LAUNCH_APPROVAL.example.json` is a **template only**. The real file
(`approvals/ADS_LAUNCH_APPROVAL.json`) is the single launch key for paid spend:

- **It must only ever be created, edited, or committed by the human founder.**
  No agent may write it, stage it, commit it, template-fill it "helpfully", or
  simulate its presence. An agent that generates the real approval file has, in
  effect, approved its own spending of real money — that is the exact failure
  mode this gate exists to prevent.
- Agents may **read** it to check which campaigns/channels/budgets are approved,
  and must treat its absence as "everything stays PAUSED".
- Recommended: add `approvals/ADS_LAUNCH_APPROVAL.json` to `.gitignore` if the
  founder prefers it to live outside the repo entirely; the example file is the
  only one that belongs in version control.
