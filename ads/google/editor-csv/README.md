# Google Ads Editor import — HB UK Search v1

`hb_uk_google_search_v1.csv` contains both search campaigns in one importable file:

| Campaign | Budget | Status | Ad groups |
|---|---|---|---|
| HB_UK_GOOGLE_SEARCH_BRAND_V1 | £10.00/day | **Paused** | HB_BRAND_CORE |
| HB_UK_GOOGLE_SEARCH_NONBRAND_V1 | £10.00/day | **Paused** | HB_NB_CREATINE_WOMEN, HB_NB_CREATINE_COLLAGEN, HB_NB_HALAL |

Row types in the file (Ads Editor infers from populated columns):
- **Keyword rows** — `Keyword` + `Match Type` (`Exact` / `Phrase`) filled, headline columns empty.
- **Campaign negative rows** — `Match Type` = `Campaign Negative Phrase`, no ad group. The non-brand negatives include the sensitive-health block (pcos, hormones, bloating, pregnancy, etc.) — **never remove these**; we do not bid on condition terms.
- **RSA rows** — `Final URL`, `Path 1/2`, `Headline 1–15` (all ≤30 chars, verified) and `Description 1–4` (all ≤90 chars, verified) filled.

## Import path

1. **Before importing:** find-and-replace `{{SHOPIFY_STORE_DOMAIN}}` with the live store domain in the CSV. Do not import with the placeholder.
2. Google Ads Editor → **Account** → **Import** → **From file…** → select the CSV.
3. Review the import preview: 2 campaigns, 4 ad groups, 21 keywords, 28 campaign negatives, 4 RSAs. Fix any column-mapping prompts (columns use Editor's standard names).
4. Check **Keep import as proposed changes**, review the diff, then **Post** — everything posts as **Paused**.
5. In Google Ads UI after posting: confirm location = United Kingdom (all campaigns), language English, networks = Search only (untick partners/Display), and attach the sitelinks from `../campaigns/*.yaml` (sitelinks are not in the CSV — Editor imports them via a separate shared-library sheet if desired).
6. Link GA4/conversion actions **before** any enable; bidding starts Maximise Clicks (non-brand) / Maximise Conversions (brand) per the YAML.

## Hard gates before enabling anything

- Campaigns stay Paused until the human approval file exists in `approvals/` and lists both campaign names (see `approvals/ADS_LAUNCH_APPROVAL.example.json`).
- Combined Google spend ≤ £25/day channel cap (currently £20/day planned).
- Copy is compliance-checked in `ads/compliance/approved-ads.md`; any new headline/description goes through `ads/compliance/ad-claims-matrix.csv` first.
