# HerBody store provisioning

Idempotent setup script for the HerBody Shopify store. Node 20+, **zero npm
dependencies** — it talks straight to the Admin GraphQL API (version
`2025-07`) with `fetch`.

## What it does

| Resource | Behaviour |
| --- | --- |
| Product **The Daily — Creatine + Collagen** (`the-daily-creatine-collagen`) | Created via `productSet` if the handle doesn't exist: vendor `HerBody`, one variant `HB-DAILY-300` at **£39.99**, no compare-at, 300g weight, metafields `herbody.batch_note` + `herbody.halal_certification`. Skipped if present. |
| Online Store publication | Product published via `publishablePublish`. |
| Collection **Shop** (`shop`) | Created if missing; product added to it. |
| Pages | `science`, `pact`, `app`, `tiktok`, `faq`, `contact` + policy pages `privacy`, `terms`, `shipping`, `returns`, `supplement-disclaimer` — each created with real HerBody copy and the matching `page.<handle>` template suffix. Skipped if the handle exists. |
| Menus & shop policies | Cannot be fully automated sensibly — the script prints exact manual instructions at the end. |

Every step logs `✓ created`, `• skipped (exists)` or `✗ error`; the script
exits non-zero if any API call fails. The admin token is **never** printed.

## Custom app & scopes

Create a custom app in the store (Settings → Apps and sales channels →
Develop apps) with these Admin API scopes:

- `write_products` (product, variant, collection)
- `write_publications` (publish to Online Store)
- `write_content` (pages)
- `read_orders` (used by later analytics/ops tooling — harmless to grant now)

Install the app and copy the **Admin API access token** (`shpat_…`).

## Run locally

```bash
cd shopify/setup

export SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
export SHOPIFY_ADMIN_TOKEN="shpat_xxx"        # never commit this

# see every mutation payload without calling the API:
DRY_RUN=true node store-setup.mjs

# do it for real:
node store-setup.mjs
```

(Or `npm run dry-run` / `npm run setup`.)

## Run via GitHub Actions

Add repository secrets `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_TOKEN`,
then a manual workflow such as:

```yaml
name: Provision Shopify store
on: workflow_dispatch
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node shopify/setup/store-setup.mjs
        env:
          SHOPIFY_STORE_DOMAIN: ${{ secrets.SHOPIFY_STORE_DOMAIN }}
          SHOPIFY_ADMIN_TOKEN: ${{ secrets.SHOPIFY_ADMIN_TOKEN }}
```

## After the script

1. **Theme**: push `shopify/theme/` with `shopify theme push` (Shopify CLI)
   and assign the menus in the theme editor.
2. **Subscriptions**: install Shopify Subscriptions (or another selling-plan
   app) and create *Subscribe & save 15%* → £33.99, every 30 days. The theme
   reads selling plans dynamically — no code change needed.
3. **Policies**: paste the page copy into Settings → Policies so checkout
   links to them.
4. **Reviews stay OFF** (theme setting `show_reviews`, default false) until
   genuine, verifiable reviews exist — UK DMCC Act 2024.
