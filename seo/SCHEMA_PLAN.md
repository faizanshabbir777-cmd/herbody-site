# HerBody — Structured Data (Schema.org) Plan

JSON-LD only, one block per type per page, emitted by theme snippets. Everything below is validated with Google's Rich Results Test before launch and re-validated when templates change. **Hard rule: no `aggregateRating`, no `review` properties anywhere until genuine verified reviews exist (Decision D6, DMCC Act 2024) — fake or unverifiable review markup is the same banned practice in structured form.**

## 1. Product — product page only

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "HerBody No.01 — The Daily · Creatine + Collagen for Women",
  "sku": "HB-DAILY-300",
  "brand": { "@type": "Brand", "name": "HerBody" },
  "description": "5g Creapure® creatine, 5g Verisol® collagen peptides and a complete multivitamin in one 14g strawberry-lemonade scoop. 21 servings. Halal certified (HMC GB18/2026), made in a GMP-certified UK facility, third-party batch tested.",
  "image": ["https://SHOPIFY_STORE_DOMAIN/cdn/…/the-daily-pack.png"],
  "offers": [
    {
      "@type": "Offer",
      "name": "One-time",
      "price": "39.99",
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock",
      "url": "https://SHOPIFY_STORE_DOMAIN/products/the-daily-creatine-collagen",
      "shippingDetails": { "@type": "OfferShippingDetails", "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "GB" } },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "GB",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility"
      }
    },
    { "@type": "Offer", "name": "Subscribe", "price": "33.99", "priceCurrency": "GBP", "availability": "https://schema.org/InStock" }
  ]
}
```

Notes: description uses factual/certificate claims only — no health-benefit text inside schema (avoids claims appearing in SERPs stripped of their mandatory context). NO `aggregateRating`. `SHOPIFY_STORE_DOMAIN` swapped at store creation.

## 2. Organization — home page only

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "HerBody Ltd",
  "url": "https://SHOPIFY_STORE_DOMAIN/",
  "logo": "https://SHOPIFY_STORE_DOMAIN/cdn/…/herbody-wordmark.png",
  "sameAs": ["TODO_VERIFY instagram URL", "TODO_VERIFY tiktok URL"],
  "address": { "@type": "PostalAddress", "addressLocality": "London", "addressCountry": "GB" },
  "contactPoint": { "@type": "ContactPoint", "contactType": "customer support", "email": "hello@SHOPIFY_STORE_DOMAIN" }
}
```

`sameAs` stays empty until social handles are verified (`product-facts.json` marks both TODO_VERIFY). Full registered address added once on the T&Cs page — schema mirrors it then.

## 3. FAQPage — FAQ page only (and only for Q&As visibly on that page)

Source questions from `operations/CUSTOMER_SUPPORT_SOP.md` macros: what's in the scoop; the half-scoop first week; is it halal (HMC GB18/2026 answer); batch testing/COA; delivery times; the 30-day flavour guarantee vs 14-day statutory right; subscription cancellation; where the 20% goes; pregnancy caution (the standard referral-to-GP answer verbatim). Answers must match page copy word-for-word — no schema-only answers, and pregnancy/health answers keep their full caution text inside the markup, never truncated.

## 4. BreadcrumbList — all non-home pages

`Home → Shop → No.01 The Daily`, `Home → Science`, `Home → The Pact`, etc. Emit only trails that match visible navigation.

## 5. Explicitly NOT emitted

- `aggregateRating` / `Review` (until real verified reviews — then a new decision entry, moderation policy and re-QA).
- `MedicalWebPage`, health-condition entities, or anything implying medical content (the science page is `WebPage`).
- `Offer.priceValidUntil` gimmicks (no fake deadlines — mirrors the no-urgency rule).
- Video/HowTo schema at launch (revisit when real video assets settle).

## 6. Alt-text rules (applies to every image, theme-enforced)

1. Describe what's actually in the frame, ≤ 125 characters: "Cream HerBody pouch beside a shaker of pink strawberry lemonade on a kitchen counter" — not "supplement lifestyle image".
2. Product images name the product: "HerBody No.01 The Daily 300g pouch, strawberry lemonade".
3. **No claims in alt text** — alt text is copy and passes the same gate; never "creatine for glowing skin" (also a Rejected-Claims breach).
4. No keyword stuffing; one natural keyword where honest.
5. Decorative flourishes (✦ sparkles, hairline rules) get `alt=""` / `aria-hidden="true"`.
6. Real-women photography alt text describes the scene with dignity, never bodies ("woman laughing while shaking a drink in morning light", never body-descriptive language).
7. Certificate images: name the document — "HMC halal certificate GB18/2026 for HerBody No.01".
