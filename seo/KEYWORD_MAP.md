# HerBody — UK Keyword Map

One keyword cluster → one URL → one intent. No cannibalisation: if two clusters point at one URL, they share intent; if a keyword implies a promise we can't legally make, it gets an informational treatment or nothing. Volumes are directional (UK, low-competition niche — validate in Search Console after 90 days rather than trusting tool estimates for a new brand).

URLs are canonical Shopify paths; the GitHub Pages brand site mirrors `/`, product, pact and app surfaces until the store is live, then canonicals point at the store (`SHOPIFY_STORE_DOMAIN` placeholder — see `docs/ASSUMPTIONS.md` §2).

| Keyword cluster (UK phrasing) | Primary keyword + satellites | URL | Intent | Notes / compliance rail |
|---|---|---|---|---|
| Creatine for women | `creatine for women uk`, `best creatine for women`, `creatine women's health`, `should women take creatine` | `/products/the-daily-creatine-collagen` (commercial) + `/pages/science` (informational satellites) | Commercial + informational split | Performance claim only in authorised wording (Claims Matrix row 1). "Should women take…" queries answered on science page, FAQ-schema'd. |
| Creatine + collagen combined | `creatine and collagen powder`, `collagen creatine blend`, `creatine and collagen together`, `can you take creatine and collagen` | `/products/the-daily-creatine-collagen` | High-commercial — our exact product; lowest competition, highest priority | Collagen = factual statements only; benefits routed via vitamin C/biotin (rows 2–3, 5). |
| Halal supplement cluster | `halal creatine uk`, `halal collagen`, `halal collagen uk`, `halal supplements for women`, `is creatine halal` | `/products/the-daily-creatine-collagen` + FAQ entry (`/pages/faq#halal`) for "is creatine halal" | Commercial, strongly differentiating — few UK competitors hold HMC certification with source-of-slaughter bovine collagen | Certificate-backed factual claims only (row 14). Cert PDF linked on page = link-worthy asset. |
| Women's multivitamin format | `women's multivitamin powder`, `multivitamin powder uk`, `all in one supplement for women` | `/` (brand home positions the all-in-one) | Commercial, secondary | "Complete multivitamin, 100% NRV" factual framing (row 13). |
| All-in-one / replace-the-shelf | `all in one women's supplement`, `supplement stack for women uk` | `/pages/science#the-math` | Commercial-investigational | "The math" module gated on price verification (row 18). |
| Inositol — **informational only** | `inositol supplement uk`, `myo inositol uk`, `40:1 inositol`, `myo and d-chiro inositol` | `/pages/science#inositol` (informational section) — **never a dedicated landing page promising outcomes** | Informational. These searchers are often PCOS-motivated; we may state ratio, dose and "studied in PCOS research" ceiling — nothing more | HARD RAIL: no condition-treatment promise, no "inositol for PCOS" page title, no PPC bidding on PCOS condition terms, no implying the reader has a condition. Content answers "what is 40:1 inositol" factually and points to the label. |
| Flavour/format modifiers | `strawberry lemonade creatine`, `creatine powder no added sugar`, `unflavoured alternative creatine` (negative) | `/products/the-daily-creatine-collagen` | Long-tail commercial | Factual. We are flavoured-only — don't chase unflavoured terms. |
| Trust/verification | `third party tested supplements uk`, `batch tested creatine`, `supplement coa certificate` | `/pages/science#testing` | Informational-trust | COA-per-lot is a genuine differentiator; earns citations. |
| Brand + pledge | `herbody`, `herbody daily`, `herbody 20 percent pledge` | `/`, `/pages/pact` | Navigational | Protect with exact-match brand PPC later; pact page carries pledge wording (row 16). |
| App | `herbody app`, `supplement tracking app skin score` | `/pages/app` | Navigational/curiosity | Skin Score described as a tracking feature, never as proof of efficacy. |

## Priorities (first 90 days)

1. **`creatine and collagen powder` + `collagen creatine blend`** — we *are* the query; win it before competitors notice the SERP.
2. **Halal cluster** — certificate-backed moat; also the clearest PPC economics (`hb_uk_google_prospecting_thedaily` / `rsa_halal_a`).
3. **`creatine for women uk`** — head term; product page + science page pincer.
4. Trust/testing cluster — compounding content asset, feeds every other page's E-E-A-T.

## Explicitly not targeted

- Any PCOS-treatment phrasing (`inositol for pcos`, `pcos supplements uk`) — informational science section may *rank* for adjacent queries organically; we do not build landing pages or ads promising condition outcomes (Claims Matrix row 4, Rejected Claims #10).
- Weight-loss and de-bloat terms (`supplements for bloating`, `weight loss powder`) — Rejected Claims #2, #8.
- Competitor brand names — no comparative pages at launch (thin-content risk + comparative-advertising rules; revisit with real data).
