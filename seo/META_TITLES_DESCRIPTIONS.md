# HerBody — Meta Titles & Descriptions

Rules: titles ≤ 60 characters where possible, descriptions 140–160; every description contains a factual hook (dose, price frame, certificate) — no banned claims (`docs/REJECTED_CLAIMS.md`), no urgency bait. British English. Prices per `product-facts.json`. Pipe separator, brand suffix "· HerBody" on non-home pages.

| Page | URL | Title | Meta description |
|---|---|---|---|
| Home | `/` | HerBody — Creatine + Collagen for Women, One Scoop | 5g Creapure® creatine, 5g Verisol® collagen and a complete multivitamin in one strawberry-lemonade scoop. Halal certified, batch tested, made in the UK. From £1.62 a day. |
| Product | `/products/the-daily-creatine-collagen` | No.01 The Daily — 5g Creatine + 5g Collagen · HerBody | 13 actives, every dose on the label. 21 servings, £39.99 or £33.99 on subscribe. Halal certified (HMC), COA per batch, 30-day flavour guarantee. Ships from London. |
| Science | `/pages/science` | The Science: Every Dose, Every Study Count · HerBody | What 5g creatine, 5g Verisol® collagen, 500mg 40:1 inositol and 100mg hyaluronic acid are — and the authorised claims behind our label. Nothing hidden, nothing vague. |
| Pact | `/pages/pact` | The Pact: 20% of Profits, Audited · HerBody | 20% of HerBody profits — audited annually — fund refuge, care and crisis support for women. Every pouch earns 2 charity tokens; you choose the cause. |
| App | `/pages/app` | The HerBody App: Skin Score & Charity Tokens · HerBody | Track your ritual, follow your Skin Score over the weeks, and allocate your charity tokens to the cause you choose. The companion app for The Daily. |
| FAQ | `/pages/faq` | FAQ: Doses, Halal Certification, Delivery · HerBody | Straight answers: what's in the scoop, how the half-scoop first week works, our HMC halal certification, batch testing, delivery from London and the 30-day flavour guarantee. |
| TikTok landing | `/pages/tiktok` | Seen Us on TikTok? Start Here · HerBody | The label behind the video: 5g creatine + 5g collagen + a complete multivitamin, one scoop. Every dose declared, every batch tested. From £1.62 a day. |
| Shipping policy | `/policies/shipping-policy` | Shipping & Delivery · HerBody | Dispatched from London within 1 working day by Royal Mail Tracked. Rates, timescales and how your batch code is recorded against your order. |
| Returns & refunds | `/policies/refund-policy` | Returns, Refunds & the 30-Day Flavour Guarantee · HerBody | Your 14-day cancellation right, our 30-day flavour guarantee on top, and exactly how refunds work. Hate the flavour? We refund the pouch. |
| Terms of service | `/policies/terms-of-service` | Terms of Service · HerBody | The terms for shopping with HerBody Ltd, London — orders, subscriptions, cancellation and your statutory rights. |
| Privacy policy | `/policies/privacy-policy` | Privacy Policy · HerBody | What we collect, why, and your rights under UK GDPR. No marketing pixels fire before you consent. |
| Subscription terms | `/pages/subscription-terms` | Subscription Terms — £33.99/month, Cancel Any Time · HerBody | How subscribe works: £33.99 every month (15% off), skip or cancel online in two clicks, renewal reminders before every charge. |
| 404 | `/404` | Page Not Found · HerBody | That page isn't here — but the scoop is. Head back to The Daily. |

## Notes

- **Robots:** policy pages `index,follow` (trust surface); `/dash/` and `data/` paths on the Pages site are `noindex` + disallowed in `robots.txt`.
- **Canonicals:** while both the Pages brand site and Shopify store exist, the store is canonical for product/commercial intent; Pages mirrors carry `rel=canonical` to the store equivalents once live (blocker item, `docs/ASSUMPTIONS.md` §6.8).
- **No review snippets:** titles/descriptions never mention ratings or reviews (none exist — DMCC, Decision D6). No "★" characters.
- **OG/Twitter cards:** same copy trimmed to platform limits; OG image is the cream pack render (`og-image.png`), alt text per `seo/SCHEMA_PLAN.md` rules.
