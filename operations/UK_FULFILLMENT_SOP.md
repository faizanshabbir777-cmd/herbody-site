# HerBody — UK Fulfilment SOP

Scope: getting a paid Shopify order from "New" to "Delivered", from London, with the batch code recorded on every order. Applies to in-house packing (launch state) and transfers cleanly to a UK 3PL later (§7).

---

## 1. Setup (once)

- Shopify location = London fulfilment address; Royal Mail set up via **Royal Mail Click & Drop** connected to Shopify (imports orders, prints labels, writes tracking back).
- Shipping profiles: **Royal Mail Tracked 48** (standard, 2–3 working days), **Royal Mail Tracked 24** (express, 1–2 working days). Letterbox-friendly: a single 300g pouch in a padded box ships as Large Letter/small parcel — confirm final packed dimensions at first stock intake and lock the cheapest compliant format.
- Rates configured per `operations/LAUNCH_OPERATIONS_CHECKLIST.md` §4; whatever is chosen must match the shipping lines in `docs/COPY_BANK.md` §6 (TODO_VERIFY flag there until set).
- Packaging stock: outer box/mailer (cream, ink logo), pouch, insert card (ritual instructions + QR `hb_uk_partner_brand_app` per UTM taxonomy + pregnancy caution + food-supplement statement), fragile-free — no fillers needed for a soft pouch.

## 2. Batch-code recording (non-negotiable, every order)

Every pouch carries a lot code (format like `HB-26·0417`) tied to a COA.

1. At **stock intake**: log the delivery in `Batch Log` (spreadsheet or Shopify metafield store): batch code, quantity received, best-before date, COA file reference. File the COA PDF in the compliance drive **before** any unit of that batch ships.
2. At **pick**: read the batch code off the pouch being packed.
3. At **pack**: record the batch code on the order — Shopify order **note attribute `batch_code`** (Click & Drop leaves notes intact) — and print it on the dispatch note ("Your batch: HB-26·0417 — ask us for its certificate of analysis").
4. FIFO by best-before date; a batch within 6 months of best-before is flagged to the founder before further sale.

Why: a recall or a customer COA request must resolve to exact orders in minutes. This is also what makes "COA per lot — ask us for yours" an honest trust pill.

## 3. Daily pick/pack/ship run (order cut-off 14:00 UK)

1. **Pull orders**: Shopify → Orders → filter Unfulfilled + Paid. Check for fraud flags (Shopify risk = high → hold, follow §6).
2. **Pick**: oldest batch first (FIFO). Verify flavour/SKU (single SKU today — this step future-proofs).
3. **Pack**: pouch + insert card; visual QC — seal intact, print legible, batch/best-before stamped.
4. **Record batch code** per §2.
5. **Label**: Click & Drop batch-print; service = customer's chosen rate; subscription renewals default Tracked 48.
6. **Dispatch**: Royal Mail collection or Post Office drop by 16:00; Click & Drop marks orders fulfilled in Shopify → customer gets the tracking email (template includes batch code line).
7. **Same-day rule**: orders before 14:00 ship same working day; later orders next working day. This is the promise behind "Dispatched within 1 working day" — if a day is missed, the promise copy gets fixed or the process does.

## 4. Subscription renewals

Shopify Subscriptions generates renewal orders automatically (billing anniversary). They flow through the same run — no separate path. Failed-payment orders never reach the pick list (app dunning handles retries; support SOP covers customer contact).

## 5. Stock control

- Reorder point: 6 weeks of cover at trailing 30-day run rate (the metrics agent surfaces run rate in the Monday digest; founder places PO).
- Weekly cycle count (it's one SKU — count the shelf); Shopify inventory adjusted same day; oversell protection ON (stop selling at zero — no backorders at launch).

## 6. Exceptions

- **High-risk order**: hold fulfilment, email the customer for confirmation, cancel/refund if unresolved in 48h.
- **Damaged in transit**: replace on photo evidence, no return demanded; log batch + Royal Mail claim.
- **Lost (tracking dead >5 working days domestic)**: one replacement, Royal Mail claim filed.
- **Returned-to-sender**: contact customer; reship once free; after that, refund minus reshipping per T&Cs.
- **Recall (worst case)**: pull batch log → list every order with the batch code → email + refund/replace per FSA guidance; notify local authority/FSA as required. The batch discipline in §2 is what makes this a 1-hour job instead of an impossible one.

## 7. Moving to a 3PL (when >25 orders/day sustained)

Requirements written into any 3PL contract: UK warehouse; lot-level inventory tracking with **batch code captured per order line** and returned via API/CSV; FIFO enforcement; our packaging + insert; Royal Mail or equivalent tracked services; recall support SLA. The Shopify location swaps to the 3PL; §2 and §3 become their SOP contractually, and we audit monthly against the batch log.
