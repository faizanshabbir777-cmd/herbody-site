# HerBody

A static marketing site for **HerBody** — a halal beauty-supplement house from London. One pouch carries creatine, collagen, a full multivitamin and botanicals at clinically meaningful doses, plus a pact: £1 and 10% of profit from every pouch goes to the cause she names each month.

Live at **https://faizanshabbir777-cmd.github.io/herbody-site/**

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home — hero, the math, product strip, the pact, the app, reviews, the Quarterly, FAQ, newsletter |
| `product.html` | The Daily (No. 01) product detail — ingredients, doses, subscribe/single purchase |
| `pact.html` | The Pact — the £1 + 10% giving mechanic and the eight vetted charity partners |
| `app.html` | The App — the Mirror, the Calendar, the Pact and Impact features |
| `quarterly.html` | The Quarterly — long-read essays and journal |
| `about.html` | About — the house's story |

A custom `404.html` is included, along with `sitemap.xml`, `robots.txt`, `site.webmanifest` and icons.

## Tech

- Hand-written static **HTML, CSS and JavaScript** — no framework, no build step, nothing to compile.
- Shared styling in `styles.css`; home-page-specific styles live inline in `index.html`.
- Shared interactions in `site.js` (defer-loaded) — bag count persisted via `sessionStorage`, FAQ accordions, purchase toggles, quantity steppers, newsletter handling, the in-app pact selector, and smooth in-page scrolling.
- Typography via **Google Fonts**: Newsreader, Geist and Geist Mono.

Because the site is just files, every page can be opened directly in a browser — but running a local server is recommended so root-relative paths and fetches behave correctly.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Any static file server works equally well.

## Deployment

The site deploys two ways, both from the repository root with no build step:

- **GitHub Pages** — via the included workflow at `.github/workflows/deploy-pages.yml`. It runs on push (and on demand via `workflow_dispatch`), uploads the repository as the Pages artifact and publishes to **https://faizanshabbir777-cmd.github.io/herbody-site/**.
- **Vercel** — configured by `vercel.json`, which enables clean URLs, drops trailing slashes, sets long-lived cache headers on static assets and adds baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).

## Project structure

```
herbody-site/
├── index.html              # Home
├── product.html            # The Daily — product detail
├── pact.html               # The Pact
├── app.html                # The App
├── quarterly.html          # The Quarterly
├── about.html              # About
├── 404.html                # Not-found page
├── styles.css              # Shared styles
├── site.js                 # Shared interactions
├── favicon.svg             # Icons / manifest
├── site.webmanifest
├── sitemap.xml             # SEO
├── robots.txt
├── vercel.json             # Vercel config
└── .github/workflows/
    └── deploy-pages.yml    # GitHub Pages deploy
```

---

© HerBody Ltd · London
