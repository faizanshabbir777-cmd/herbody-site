# HerBody — Returns, Cancellations & Refunds SOP

Two distinct rights run side by side. Staff (and support macros) must never blur them, and the generous one must never be used to talk a customer out of the statutory one.

| | **14-day statutory cancellation** (Consumer Contracts Regulations 2013) | **30-day flavour guarantee** (HerBody policy) |
|---|---|---|
| What it is | Legal right to cancel a distance purchase | Our promise: hate the flavour, we refund the pouch |
| Window | 14 days starting the day **after** delivery | 30 days from delivery |
| Condition | Unopened for a sealed consumable: we rely on the hygiene exemption for **opened** pouches under this right — but see interplay below | Opened, half-finished, doesn't matter |
| Customer pays return postage? | Yes (stated in T&Cs) | No return needed — we don't ask for the pouch back |
| Refund | Full price + standard outbound shipping, within 14 days of cancellation (or of receiving goods back if we requested return) | Product price for that pouch, within 5 working days of approval |
| Applies to subscriptions? | Yes — first order, plus the contract itself can be cancelled any time | Yes — first pouch of a subscription |

**Interplay rule:** the flavour guarantee is a *superset* in practice — any opened-pouch complaint within 30 days goes down the guarantee path (better for the customer, simpler for us). The statutory route matters mainly for unopened returns and for customers who invoke it by name. If a customer says "I want to cancel under my 14-day right", we follow the statutory route exactly — we never respond "use our guarantee instead".

## A. Statutory cancellation workflow (14-day)

1. Customer notifies us by any clear statement (email is fine; a model cancellation form is linked in T&Cs). Log date received — the clock for refunding starts here.
2. **Order not yet dispatched** → cancel in Shopify (Orders → More actions → Cancel order), full refund to original method, done same day.
3. **Dispatched/delivered, unopened** → email return instructions (return address, customer pays postage, get proof of postage). On arrival, inspect seal → refund product + our standard outbound shipping (not express upgrades — statutory rule) within 14 days of receiving it back.
4. **Delivered, opened** → hygiene exemption *may* remove the statutory right for the opened pouch, but do not fight on this ground: route to the flavour guarantee (path B) if within 30 days. Outside 30 days and opened → founder decision, default to goodwill refund for first-time customers.
5. Record reason code in the order tags: `cancel_changed_mind`, `cancel_late_delivery`, `cancel_other`.

## B. 30-day flavour guarantee workflow

1. Customer emails (or replies to any of ours) within 30 days of delivery saying the flavour isn't for them. No interrogation — one optional question, for product learning only: "What did it taste like to you?"
2. Verify: order date + delivery date within window, first claim on this account (guarantee is once per customer, stated in policy).
3. No return required. Refund the pouch price (£39.99, or £33.99 if subscribed) in Shopify (§C). If subscription: ask whether to cancel the subscription too — never auto-cancel without asking, never keep it running against their wishes.
4. Tag order `refund_flavour_guarantee`; the metrics agent counts these weekly (a rising rate is a product signal, not a support failure).
5. Send the confirmation macro (see `operations/CUSTOMER_SUPPORT_SOP.md` macro 6) — warm, zero guilt: the guarantee exists so trying us is risk-free, and we mean it.

## C. Refund mechanics in Shopify (all paths)

1. Orders → open the order → **Refund**.
2. Enter quantity/amount per the path above (include outbound shipping for statutory cancellations; product-only for flavour guarantee).
3. Restock toggle: ON only for unopened returns physically received; OFF for flavour-guarantee refunds (no goods returned).
4. Reason field: the tag code from the workflow.
5. Refund goes to the **original payment method** (never gift card/credit as substitute — statutory requirement). Shopify Payments typically lands in 5–10 working days; tell the customer this timeline in the confirmation.
6. Subscription orders: refund in Shopify **and** check the Subscriptions app — pause/cancel the contract if that's what was agreed; confirm next-billing status in writing to the customer.

## D. Edge cases

- **Damaged/faulty on arrival** → Consumer Rights Act path, not this SOP's discretion: replace or full refund including all shipping, customer never pays return postage. Photo is enough; log against batch code (see `operations/UK_FULFILLMENT_SOP.md` §6).
- **Chargeback received** → respond via Shopify with fulfilment + tracking + policy evidence; never refund on top of an open chargeback.
- **Serial guarantee claims across accounts** (same address/payment) → founder review; we may decline the *guarantee* (policy allows once per customer) but never the statutory right.
- **Refused delivery** → treat as statutory cancellation from date of return receipt.

## E. Policy page requirements (mirrors `docs/COMPLIANCE_CHECKLIST.md` §6)

The refund policy page must state: both rights side by side, who pays postage in each case, the model cancellation form, refund timelines, the once-per-customer guarantee limit, and that statutory rights are unaffected by the guarantee. Copy lives in the theme's policy templates and passes the same claims gate as everything else.
