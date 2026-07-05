#!/usr/bin/env node
/* ============================================================
   HerBody store provisioning — Shopify Admin GraphQL API 2025-07
   Node 20+, zero dependencies, idempotent (lookup-by-handle first).

   Env:
     SHOPIFY_STORE_DOMAIN   e.g. herbody-uk.myshopify.com
     SHOPIFY_ADMIN_TOKEN    Admin API access token (custom app)
     DRY_RUN=true           print every mutation payload, call nothing

   Provisions:
     · Product  "The Daily — Creatine + Collagen"  (handle
       the-daily-creatine-collagen, SKU HB-DAILY-300, £39.99, 300g)
       + metafields (batch note, halal certification text)
     · Publishes the product to the Online Store
     · Collection "Shop" (+ product membership)
     · Pages: science, pact, app, tiktok, faq, contact
       + privacy, terms, shipping, returns, supplement-disclaimer
     · Prints manual steps for menus and shop policies

   The token is never logged. Exits non-zero on any API error.
   ============================================================ */

const API_VERSION = '2025-07';

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

if (!DOMAIN || (!TOKEN && !DRY_RUN)) {
  console.error('✗ Missing env. Required: SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN (or DRY_RUN=true).');
  process.exit(1);
}

const ENDPOINT = `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
let hadErrors = false;

/* ---------------- GraphQL transport ---------------- */

async function gql(label, query, variables = {}) {
  if (DRY_RUN) {
    if (/^\s*mutation/.test(query)) {
      console.log(`\n— DRY RUN · would call mutation: ${label}`);
      console.log(JSON.stringify({ variables }, null, 2));
    } else {
      console.log(`— DRY RUN · would query: ${label} (treating as "not found")`);
    }
    return null;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    hadErrors = true;
    console.error(`✗ ${label}: HTTP ${res.status} ${res.statusText}`);
    return null;
  }
  const json = await res.json();
  if (json.errors) {
    hadErrors = true;
    console.error(`✗ ${label}: ${JSON.stringify(json.errors)}`);
    return null;
  }
  return json.data;
}

function userErrors(label, payload) {
  const errs = payload?.userErrors;
  if (errs && errs.length) {
    hadErrors = true;
    console.error(`✗ ${label}: ${errs.map((e) => `${(e.field || []).join('.')}: ${e.message}`).join(' | ')}`);
    return true;
  }
  return false;
}

/* ---------------- content constants ---------------- */

const PRODUCT = {
  title: 'The Daily — Creatine + Collagen',
  handle: 'the-daily-creatine-collagen',
  vendor: 'HerBody',
  productType: 'Powdered daily supplement',
  status: 'ACTIVE',
  descriptionHtml: [
    '<p><strong>HerBody No.01 — The Daily.</strong> 5g creatine + 5g Verisol® collagen + a complete multivitamin. One 14g strawberry-lemonade scoop, 21 servings per 300g pouch, naturally flavoured with no added sugar.</p>',
    '<p>13 actives, each at a meaningful, studied amount, every one disclosed on the label: creatine monohydrate (Creapure®) 5,000mg, Verisol® bioactive collagen peptides 5,000mg, myo + D-chiro inositol 40:1 500mg, dandelion root 250mg (traditional-use botanical), hyaluronic acid 100mg, cranberry 36mg PAC (traditional-use botanical), and a complete multivitamin at 100% NRV including biotin 5,000µg, L-methylfolate 400µg, vitamin B6 as P-5-P, chromium, vitamin C, vegan vitamin D3, plus vitamins A · E · K2 and a full B-complex.</p>',
    '<p>Creatine increases physical performance in successive bursts of short-term, high-intensity exercise. Biotin contributes to the maintenance of normal hair and normal skin. Vitamin C contributes to normal collagen formation for the normal function of skin.</p>',
    '<p>Halal certified · HMC protocol GB18/2026 (bovine collagen source-of-slaughter certified). Made in a GMP-certified UK facility. Third-party batch tested — COA per lot.</p>',
    '<p><strong>How to use:</strong> scoop 14g, shake with 200ml cold water for 10 seconds, drink every morning — training days and rest days. First 7 days: half scoop (7g). Day 8+: full scoop. The gentle way to start.</p>',
    '<p>30-day flavour guarantee — hate it, we refund the pouch. Ships free UK, 1–2 days, from London. 20% of profits fund refuge, care and crisis support for women — every pouch earns 2 charity tokens in the app, and you choose the cause.</p>',
    '<p><em>Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle. For healthy adults. Not suitable if pregnant or breastfeeding. Consult your GP if taking medication or managing a condition.</em></p>'
  ].join('\n'),
  sku: 'HB-DAILY-300',
  priceGBP: '39.99',
  weightGrams: 300,
  metafields: [
    {
      namespace: 'herbody',
      key: 'batch_note',
      type: 'single_line_text_field',
      value: 'Third-party batch tested · COA per lot · batch code format HB-YY·NNNN (example HB-26·0417)'
    },
    {
      namespace: 'herbody',
      key: 'halal_certification',
      type: 'multi_line_text_field',
      value: 'Halal certified · HMC protocol GB18/2026.\nBovine collagen source-of-slaughter certified.\nCertificate available on request.'
    }
  ]
};

const DISCLAIMER =
  '<p><em>Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle. ' +
  'For healthy adults. Not suitable if pregnant or breastfeeding. Consult your GP if taking medication or managing a condition.</em></p>';

const PAGES = [
  {
    handle: 'science',
    title: 'The Science',
    templateSuffix: 'science',
    body:
      '<p>13 actives in one 14g scoop — two lead actives at the studied amount, eleven supporting compounds, every single dose printed on the label. ' +
      'No proprietary blends, no decorative pinches. The panels below map exactly what is in the pouch, with claim wording kept where UK law puts it: ' +
      'authorised nutrition and health claims for the nutrients that have them, and honest traditional-use framing for the botanicals that don’t.</p>' +
      DISCLAIMER
  },
  {
    handle: 'pact',
    title: 'The Pact',
    templateSuffix: 'pact',
    body:
      '<p>The strength you build helps build hers. 20% of HerBody’s profits — audited annually — fund refuge, care and crisis support for women, ' +
      'through vetted partners across eight causes. Every pouch earns 2 charity tokens in the HerBody app, and you choose where your share lands.</p>' +
      '<p>Solidarity, not saviour: we don’t do guilt, we don’t do hero stories, and we publish the audit.</p>'
  },
  {
    handle: 'app',
    title: 'The App',
    templateSuffix: 'app',
    body:
      '<p>The Daily comes with the HerBody companion app. It does two quiet things: <strong>Skin Score</strong> — a daily selfie read into one simple ' +
      'elasticity score, your own record of the weeks you scoop — and <strong>charity tokens</strong> — 2 per pouch, which you send to the cause you choose. ' +
      'Your data stays yours.</p>'
  },
  {
    handle: 'tiktok',
    title: 'Start Here',
    templateSuffix: 'tiktok',
    body: ''
  },
  {
    handle: 'faq',
    title: 'FAQ',
    templateSuffix: 'faq',
    body: '<p>The things smart label-readers actually ask us — halal certification, creatine, the first seven days, and where the 20% goes.</p>'
  },
  {
    handle: 'contact',
    title: 'Contact',
    templateSuffix: 'contact',
    body:
      '<p>Questions about your order, the formula or the pledge? Write to us — we reply within two working days. ' +
      'You can also email <a href="mailto:hello@herbody.co.uk">hello@herbody.co.uk</a>.</p>'
  },
  {
    handle: 'privacy',
    title: 'Privacy Policy',
    templateSuffix: 'privacy',
    body:
      '<h2>Who we are</h2>' +
      '<p>HerBody Ltd, London EC1, United Kingdom ("HerBody", "we"). We are the data controller for personal data collected through this store.</p>' +
      '<h2>What we collect</h2>' +
      '<p>Order and account details (name, email, delivery address, purchase history), payment confirmation (we never see full card details — payments are processed by Shopify Payments and its providers), email address if you join our list, and — only with your consent — analytics and marketing cookie data.</p>' +
      '<h2>Why we use it</h2>' +
      '<p>To fulfil your orders (contract), to answer your messages (legitimate interest), to send marketing email you asked for (consent — unsubscribe anytime, one tap), and to improve the store through consented analytics.</p>' +
      '<h2>Cookies</h2>' +
      '<p>Essential cookies run the bag and checkout. Analytics and marketing pixels load only after you accept the cookie banner, in line with UK PECR. You can change your mind by clearing the site’s stored data.</p>' +
      '<h2>Sharing</h2>' +
      '<p>We share data only with the processors that run the store: Shopify (hosting and payments), our delivery carriers, and our email provider. We never sell personal data.</p>' +
      '<h2>Retention & your rights</h2>' +
      '<p>Order records are kept as long as UK tax law requires; marketing data until you unsubscribe. Under UK GDPR you can request access, correction, deletion, restriction or portability of your data, and you can complain to the ICO (ico.org.uk). Contact: hello@herbody.co.uk.</p>'
  },
  {
    handle: 'terms',
    title: 'Terms of Service',
    templateSuffix: 'terms',
    body:
      '<h2>About us</h2>' +
      '<p>This store is operated by HerBody Ltd, London EC1, United Kingdom. These terms apply to all orders placed through the store.</p>' +
      '<h2>Products</h2>' +
      '<p>Our products are food supplements for healthy adults. They are not medicines and make no medicinal claims. Always read the label. ' +
      'Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle.</p>' +
      '<h2>Orders & prices</h2>' +
      '<p>All prices are in pounds sterling and include VAT where applicable. An order is accepted when we email dispatch confirmation. ' +
      'We may decline or refund any order at our discretion (for example, suspected resale at volume).</p>' +
      '<h2>Subscriptions</h2>' +
      '<p>Subscription orders renew at the stated interval and can be paused, skipped or cancelled anytime from your account, up to the day before renewal.</p>' +
      '<h2>Your statutory rights</h2>' +
      '<p>Under the Consumer Contracts Regulations you may cancel an order within 14 days of delivery for a refund; for food supplements this applies to unopened, sealed pouches. ' +
      'This sits alongside — never instead of — our 30-day flavour guarantee. Nothing in these terms limits your rights under the Consumer Rights Act 2015.</p>' +
      '<h2>Liability</h2>' +
      '<p>We are responsible for foreseeable loss caused by our breach of these terms. We do not exclude liability where it would be unlawful to do so.</p>' +
      '<h2>Law</h2>' +
      '<p>These terms are governed by the law of England and Wales.</p>'
  },
  {
    handle: 'shipping',
    title: 'Shipping',
    templateSuffix: 'shipping',
    body:
      '<h2>UK</h2>' +
      '<p>Free UK shipping on every order. Orders placed before 2pm on a working day dispatch the same day from London; delivery is typically 1–2 working days, tracked.</p>' +
      '<h2>Tracking</h2>' +
      '<p>You’ll receive a tracking link by email at dispatch. If your parcel hasn’t arrived within 5 working days, write to hello@herbody.co.uk and we’ll sort it.</p>' +
      '<h2>International</h2>' +
      '<p>We currently ship within the UK only. International shipping is on the roadmap — join the email list and we’ll tell you the moment it opens.</p>'
  },
  {
    handle: 'returns',
    title: 'Returns & Refunds',
    templateSuffix: 'returns',
    body:
      '<h2>The 30-day flavour guarantee</h2>' +
      '<p>Hate the flavour? Tell us within 30 days of delivery and we refund the pouch — no return postage, no questions, even if it’s half empty. One guarantee refund per customer.</p>' +
      '<h2>Statutory returns</h2>' +
      '<p>You may also cancel your order within 14 days of delivery under the Consumer Contracts Regulations. For food supplements this applies to unopened, sealed pouches; we refund within 14 days of receiving the return.</p>' +
      '<h2>Damaged or wrong items</h2>' +
      '<p>If anything arrives damaged or incorrect, send a photo to hello@herbody.co.uk and we’ll replace or refund immediately — keep the pouch, no need to post it back.</p>'
  },
  {
    handle: 'supplement-disclaimer',
    title: 'Supplement Disclaimer',
    templateSuffix: 'supplement-disclaimer',
    body:
      '<p><strong>Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle.</strong></p>' +
      '<p>HerBody products are food supplements for healthy adults aged 18+. They are not medicines and are not intended to diagnose, treat, cure or prevent any disease.</p>' +
      '<p>Not suitable if pregnant or breastfeeding. Consult your GP before use if you are taking medication or managing a medical condition. ' +
      'Do not exceed the stated daily dose. Keep out of reach of children. Store cool, dry and sealed.</p>' +
      '<p>Nutrition and health claims on this site follow the wording authorised on the GB nutrition and health claims register. ' +
      'Botanical ingredients (dandelion root, cranberry) are described by traditional use only; traditional use is not an efficacy claim.</p>' +
      '<p>Every batch is third-party tested; certificates of analysis are available on request against your batch code. HerBody Ltd · London EC1.</p>'
  }
];

/* ---------------- steps ---------------- */

async function findProduct() {
  const data = await gql(
    'find product',
    `query($q: String!) { products(first: 1, query: $q) { nodes { id title handle } } }`,
    { q: `handle:${PRODUCT.handle}` }
  );
  return data?.products?.nodes?.[0] || null;
}

async function ensureProduct() {
  const existing = await findProduct();
  if (existing) {
    console.log(`• product: "${existing.title}" already exists (${PRODUCT.handle}) — skip`);
    return existing.id;
  }

  const input = {
    title: PRODUCT.title,
    handle: PRODUCT.handle,
    vendor: PRODUCT.vendor,
    productType: PRODUCT.productType,
    status: PRODUCT.status,
    descriptionHtml: PRODUCT.descriptionHtml,
    metafields: PRODUCT.metafields,
    productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
    variants: [
      {
        optionValues: [{ optionName: 'Title', name: 'Default Title' }],
        price: PRODUCT.priceGBP,
        compareAtPrice: null,
        sku: PRODUCT.sku,
        taxable: true
      }
    ]
  };

  const data = await gql(
    'productSet',
    `mutation($input: ProductSetInput!) {
      productSet(input: $input, synchronous: true) {
        product { id variants(first: 1) { nodes { id } } }
        userErrors { field message }
      }
    }`,
    { input }
  );
  if (DRY_RUN) return null;
  if (!data || userErrors('productSet', data.productSet)) return null;

  const productId = data.productSet.product.id;
  const variantId = data.productSet.product.variants.nodes[0]?.id;
  console.log(`✓ product created: ${PRODUCT.title} (${PRODUCT.sku} · £${PRODUCT.priceGBP})`);

  // weight lives on the inventory item — set via variants bulk update
  if (variantId) {
    const wd = await gql(
      'variant weight',
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { field message }
        }
      }`,
      {
        productId,
        variants: [
          {
            id: variantId,
            inventoryItem: {
              measurement: { weight: { value: PRODUCT.weightGrams, unit: 'GRAMS' } },
              tracked: true
            }
          }
        ]
      }
    );
    if (wd && !userErrors('variant weight', wd.productVariantsBulkUpdate)) {
      console.log(`✓ variant weight set: ${PRODUCT.weightGrams}g`);
    }
  }
  return productId;
}

async function publishToOnlineStore(productId) {
  if (!productId) {
    if (DRY_RUN) console.log('— DRY RUN · would publish product to Online Store');
    return;
  }
  const pubs = await gql(
    'publications',
    `query { publications(first: 20) { nodes { id catalog { title } } } }`
  );
  const online = pubs?.publications?.nodes?.find((p) => /online store/i.test(p.catalog?.title || ''));
  if (!online) {
    console.log('• publish: Online Store publication not found (is the channel installed?) — skip');
    return;
  }
  const data = await gql(
    'publishablePublish',
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { field message } }
    }`,
    { id: productId, input: [{ publicationId: online.id }] }
  );
  if (data && !userErrors('publishablePublish', data.publishablePublish)) {
    console.log('✓ product published to Online Store');
  }
}

async function ensureCollection(productId) {
  const found = await gql(
    'find collection',
    `query($q: String!) { collections(first: 1, query: $q) { nodes { id title hasProduct: productsCount { count } } } }`,
    { q: 'handle:shop' }
  );
  let collectionId = found?.collections?.nodes?.[0]?.id || null;

  if (collectionId) {
    console.log('• collection: "Shop" already exists — skip create');
  } else {
    const data = await gql(
      'collectionCreate',
      `mutation($input: CollectionInput!) {
        collectionCreate(input: $input) { collection { id } userErrors { field message } }
      }`,
      {
        input: {
          title: 'Shop',
          handle: 'shop',
          descriptionHtml: '<p>One product, done properly. 5g + 5g + a complete multivitamin — one scoop.</p>'
        }
      }
    );
    if (DRY_RUN) return;
    if (!data || userErrors('collectionCreate', data.collectionCreate)) return;
    collectionId = data.collectionCreate.collection.id;
    console.log('✓ collection created: Shop');
  }

  if (collectionId && productId) {
    const data = await gql(
      'collectionAddProducts',
      `mutation($id: ID!, $productIds: [ID!]!) {
        collectionAddProductsV2(id: $id, productIds: $productIds) { userErrors { field message } }
      }`,
      { id: collectionId, productIds: [productId] }
    );
    const errs = data?.collectionAddProductsV2?.userErrors || [];
    if (data && errs.length === 0) {
      console.log('✓ product added to "Shop" collection');
    } else if (errs.some((e) => /already/i.test(e.message))) {
      console.log('• product already in "Shop" collection — skip');
    } else if (data) {
      userErrors('collectionAddProducts', data.collectionAddProductsV2);
    }
  }
}

async function ensurePages() {
  for (const page of PAGES) {
    const found = await gql(
      `find page ${page.handle}`,
      `query($q: String!) { pages(first: 1, query: $q) { nodes { id handle } } }`,
      { q: `handle:${page.handle}` }
    );
    if (found?.pages?.nodes?.length) {
      console.log(`• page: /pages/${page.handle} already exists — skip`);
      continue;
    }
    const data = await gql(
      `pageCreate ${page.handle}`,
      `mutation($page: PageCreateInput!) {
        pageCreate(page: $page) { page { id handle } userErrors { field message } }
      }`,
      {
        page: {
          title: page.title,
          handle: page.handle,
          body: page.body,
          templateSuffix: page.templateSuffix,
          isPublished: true
        }
      }
    );
    if (DRY_RUN) continue;
    if (data && !userErrors(`pageCreate ${page.handle}`, data.pageCreate)) {
      console.log(`✓ page created: /pages/${page.handle} (template page.${page.templateSuffix})`);
    }
  }
}

function printManualSteps() {
  console.log(`
──────────────────────────────────────────────────────────
Manual steps (Shopify admin UI):

1. MENUS  (Online Store → Navigation)
   Main menu:
     Shop        → /products/${PRODUCT.handle}
     Science     → /pages/science
     The Pact    → /pages/pact
     The App     → /pages/app
     FAQ         → /pages/faq
   Footer help:  FAQ · Contact · Shipping · Returns & refunds
   Footer legal: Privacy · Terms · Supplement disclaimer
   Then assign "Main menu" in the theme editor header settings.

2. SHOP POLICIES  (Settings → Policies)
   Paste the privacy / terms / shipping / returns page copy into
   the matching policy fields so checkout links to them too.

3. SUBSCRIPTIONS
   Install a selling-plan app (or Shopify Subscriptions) and create
   "Subscribe & save 15%" (£33.99, deliver every 30 days) on the
   product — the theme's buy box and bundle selector pick the plan
   up automatically from selling_plan_allocations.

4. REVIEWS remain OFF (theme setting) until genuine verified
   reviews exist — DMCC Act 2024.
──────────────────────────────────────────────────────────`);
}

/* ---------------- run ---------------- */

(async () => {
  console.log(`HerBody store setup → ${DOMAIN} (API ${API_VERSION})${DRY_RUN ? ' · DRY RUN' : ''}\n`);

  const productId = await ensureProduct();
  await publishToOnlineStore(productId);
  await ensureCollection(productId);
  await ensurePages();
  printManualSteps();

  if (hadErrors) {
    console.error('\n✗ Finished with errors — see above.');
    process.exit(1);
  }
  console.log('\n✓ Done — store provisioning complete.');
})().catch((err) => {
  // never print headers/token — message only
  console.error(`✗ Fatal: ${err.message}`);
  process.exit(1);
});
