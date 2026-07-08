import { test } from "node:test";
import assert from "node:assert/strict";
import { gateItem, applyGate, textOf } from "../lib/compliance.mjs";

const CLEAN_ITEM = {
  type: "video",
  compliance_status: "PASS",
  payload: {
    hook: "One scoop. Ten seconds. Done.",
    caption: "The 10-second morning ritual.",
    landing_url: "https://shop.example.com/products/the-daily?utm_source=tiktok&utm_medium=organic&utm_content=vid_x01",
    utm: "utm_source=tiktok&utm_medium=organic&utm_content=vid_x01",
    compliance_status: "PASS",
  },
};

test("clean content passes the gate", () => {
  const r = gateItem(CLEAN_ITEM);
  assert.equal(r.verdict, "PASS");
  assert.deepEqual(r.reasons, []);
});

test("hard-banned claims REJECT", () => {
  const cases = [
    ["cures your fatigue", /disease\/treatment/],
    ["amazing before and after results", /before\/after/],
    ["clinically proven formula", /clinically proven/],
    ["guaranteed results in weeks", /results guarantee/i],
    ["as a customer I love these", /DMCC/],
    ["only 3 left — selling fast", /urgency/],
    ["great for weight-loss", /weight-loss/],
    ["balances your hormones", /hormone/],
  ];
  for (const [text, expect] of cases) {
    const r = gateItem({ ...CLEAN_ITEM, payload: { ...CLEAN_ITEM.payload, caption: text } });
    assert.equal(r.verdict, "REJECT", text);
    assert.match(r.reasons.join(" "), expect, text);
  }
});

test("borderline phrasing forces NEEDS_REVIEW", () => {
  const cases = [
    "tired of complicated routines?",
    "boosts energy every morning",
    "the best creatine for women",
    "20% off this week",
  ];
  for (const text of cases) {
    const r = gateItem({ ...CLEAN_ITEM, payload: { ...CLEAN_ITEM.payload, caption: text } });
    assert.equal(r.verdict, "NEEDS_REVIEW", text);
  }
});

test("structural checks: content items need landing URL + UTM + caption", () => {
  const noLanding = gateItem({ ...CLEAN_ITEM, payload: { ...CLEAN_ITEM.payload, landing_url: undefined, utm: undefined } });
  assert.equal(noLanding.verdict, "NEEDS_REVIEW");
  assert.match(noLanding.reasons.join(" "), /landing URL/);

  const badUtm = gateItem({ ...CLEAN_ITEM, payload: { ...CLEAN_ITEM.payload, utm: "not-a-utm", landing_url: "https://x.com/p" } });
  assert.match(badUtm.reasons.join(" "), /UTM/);
});

test("campaign shells and blocked checklists skip structural checks", () => {
  const campaign = gateItem({ type: "campaign", payload: { campaigns: [] } });
  assert.equal(campaign.verdict, "PASS");
  const blocked = gateItem({ type: "video", payload: { media_status: "blocked_missing_product_spec" } });
  assert.equal(blocked.verdict, "PASS");
});

test("applyGate can only hold or downgrade — never upgrade", () => {
  // agent said NEEDS_REVIEW, gate says PASS → stays NEEDS_REVIEW
  const held = applyGate({ ...CLEAN_ITEM, compliance_status: "NEEDS_REVIEW" });
  assert.equal(held.compliance_status, "NEEDS_REVIEW");
  assert.equal(held.payload.compliance_gate.verdict, "PASS");

  // agent said PASS, gate rejects → REJECT
  const bad = { ...CLEAN_ITEM, payload: { ...CLEAN_ITEM.payload, caption: "clinically proven!" } };
  const rejected = applyGate(bad);
  assert.equal(rejected.compliance_status, "REJECT");

  // agent said PASS, gate agrees → PASS
  const ok = applyGate(CLEAN_ITEM);
  assert.equal(ok.compliance_status, "PASS");
});

test("gate inspects nested paid campaign creative", () => {
  const r = gateItem({
    type: "campaign",
    payload: {
      campaigns: [{
        campaign_name: "HB_UK_TIKTOK_WINNER_X",
        creative: { hook: "Clinically proven before and after results" },
      }],
    },
  });
  assert.equal(r.verdict, "REJECT");
  assert.match(r.reasons.join(" "), /clinically proven/i);
});

test("gate inspects arrays and generation prompts too", () => {
  const r = gateItem({
    ...CLEAN_ITEM,
    payload: { ...CLEAN_ITEM.payload, on_screen_text: ["Before and after in 30 days!"] },
  });
  assert.equal(r.verdict, "REJECT");
  assert.ok(textOf({ on_screen_text: ["a", "b"] }).includes("a b"));
});
