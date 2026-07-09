# HerBody storefront migration: GitHub Pages → Shopify

The theme under `shopify/theme/` is the complete OS 2.0 port of the static
site (all storefront pages, cart, product, policies — and now Our Story +
The Quarterly). This runbook takes it live and retires the static site.

## 1. Store content (Shopify admin, one-time)

Run `shopify/setup/store-setup.mjs` (or the `shopify-store-setup` workflow,
dry-run first) to create the product, pages, and navigation. Then confirm
these pages exist with EXACT handles so the templates bind:

| Handle | Template | Was (static site) |
|---|---|---|
| `pact` | `page.pact.json` | `/pact.html` |
| `app` | `page.app.json` | `/app.html` |
| `about` | `page.about.json` (new) | `/about.html` |
| `quarterly` | `page.quarterly.json` (new) | `/quarterly.html` |

For The Quarterly's long reads, create a blog with handle `quarterly` —
each article renders as a numbered issue card. Until the blog has articles,
the section ships the founding issues as editable blocks.

## 2. Theme deploy

Push to `shopify/theme/**` — the existing `shopify-theme-deploy` workflow
uploads the "HerBody CI" theme unpublished (secrets:
`SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_STORE_DOMAIN`). Preview, then dispatch
the workflow with `publish_live: yes`.

## 3. Redirects (Shopify admin → Navigation → URL redirects)

Old static paths → Shopify routes, so shared links and search results keep
working after DNS moves:

```
/index.html      → /
/product.html    → /products/the-daily
/pact.html       → /pages/pact
/app.html        → /pages/app
/about.html      → /pages/about
/quarterly.html  → /pages/quarterly
```

## 4. DNS cutover

Point the apex/`www` at Shopify (admin → Domains). The GitHub Pages site at
`faizanshabbir777-cmd.github.io/herbody-site` stays up untouched during the
transition as a fallback.

## 5. Retire the static site (after a clean week on Shopify)

- Disable the `deploy-pages` workflow (Pages is no longer the storefront).
- Keep `sitemap.xml`/SEO handling to Shopify (it generates its own).
- The agent fleet is unaffected: revenue attribution now flows through ONE
  code path for every brand — Shopify orders + UTM (the engine's
  cross-brand requirement).

## Rollback

DNS back to GitHub Pages; the static site never stopped working. No data is
lost either way — Shopify orders remain in Shopify.
