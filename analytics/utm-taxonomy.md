# HerBody — UTM Taxonomy (`HB_UK_*` convention)

Every non-organic link the fleet or the founder creates carries UTMs built from this file. The compliance gate validates format; the metrics agent joins spend to GA4 on these strings. **Lowercase everywhere, underscores within values, no spaces, no free-typing.**

---

## 1. Structure

```
utm_source   = platform            (tiktok | meta | instagram | google | klaviyo | dash | partner)
utm_medium   = traffic type        (paid_social | paid_search | organic_social | email | referral | qr)
utm_campaign = hb_uk_<platform>_<objective>_<product>
utm_content  = <format>_<variant>  (creative-level: ugc_hook01, carousel_labelread_a, rsa_core_a)
utm_term     = <keyword_or_audience> (paid search keyword slug, or audience slug on social)
```

The campaign string always starts `hb_uk_` — country-locked so any future market (e.g. `hb_ie_`) separates cleanly in GA4.

**Objectives (closed list):** `prospecting` · `retargeting` · `brand` · `launch` · `welcome` (email) · `winback` (email) · `pledge` (pact-page pushes).
**Product slugs (closed list):** `thedaily` (today's only product) · `app` (companion-app surface) · `pact` (pledge page).

## 2. Campaign name ↔ UTM mirror rule

The **in-platform campaign name and `utm_campaign` must be the same string** (platforms allow it; where a platform forces case or prefixes, the UTM string must still appear verbatim inside the platform name). Ad-set/ad-group names mirror `utm_term`; ad/creative names mirror `utm_content`. This makes spend exports join to GA4 without a mapping table — the PPC agent enforces it, the compliance gate rejects drafts where name ≠ UTM.

## 3. Examples (correct)

| # | Link context | UTM string |
|---|---|---|
| 1 | TikTok paid prospecting, UGC-style hook variant 1 | `utm_source=tiktok&utm_medium=paid_social&utm_campaign=hb_uk_tiktok_prospecting_thedaily&utm_content=ugc_hook01&utm_term=broad_women_2238` |
| 2 | TikTok organic bio link during launch week | `utm_source=tiktok&utm_medium=organic_social&utm_campaign=hb_uk_tiktok_launch_thedaily&utm_content=bio_link` |
| 3 | Meta retargeting carousel, label-read creative A, ATC audience | `utm_source=meta&utm_medium=paid_social&utm_campaign=hb_uk_meta_retargeting_thedaily&utm_content=carousel_labelread_a&utm_term=atc_30d` |
| 4 | Google Search exact "creatine for women uk", RSA core variant A | `utm_source=google&utm_medium=paid_search&utm_campaign=hb_uk_google_prospecting_thedaily&utm_content=rsa_core_a&utm_term=creatine_for_women_uk` |
| 5 | Google Search halal cluster | `utm_source=google&utm_medium=paid_search&utm_campaign=hb_uk_google_prospecting_thedaily&utm_content=rsa_halal_a&utm_term=halal_creatine_uk` |
| 6 | Klaviyo welcome flow email 1, hero CTA | `utm_source=klaviyo&utm_medium=email&utm_campaign=hb_uk_klaviyo_welcome_thedaily&utm_content=flow1_hero_cta` |
| 7 | Instagram organic story push to pact page | `utm_source=instagram&utm_medium=organic_social&utm_campaign=hb_uk_instagram_pledge_pact&utm_content=story_tokens_explainer` |
| 8 | QR code on the pouch insert card | `utm_source=partner&utm_medium=qr&utm_campaign=hb_uk_partner_brand_app&utm_content=insert_card_v1` |
| 9 | Dashboard deep-link (founder clicks from /dash/ — kept out of marketing reports) | `utm_source=dash&utm_medium=referral&utm_campaign=hb_uk_dash_brand_thedaily&utm_content=queue_card` |

## 4. Anti-patterns (gate rejects)

- Mixed case or spaces: `HB_UK_TikTok…`, `utm_content=hook 1` ✗
- Objective not on the closed list: `…_awarenessblast_…` ✗ (extend the list via PR first)
- Campaign name in platform ≠ `utm_campaign` ✗ (mirror rule)
- Redirect-stripped UTMs: always append UTMs to the **final** landing URL (Shopify domain), not to a shortener that drops them.
- UTMs on internal links (site → same site) ✗ — self-referral pollution.
- Health-condition terms in `utm_term` (e.g. `pcos_sufferers`) ✗ — audience slugs must be behavioural/demographic only, matching the no-sensitive-targeting rule.

## 5. Registry

The PPC agent maintains `data/state/utm-registry.json` — every UTM string ever issued, with first-use date and destination. New strings are appended, never mutated; reusing `utm_content` for a different creative is forbidden (breaks historical joins).
