import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedContradiction } from "../lib/publish-rules.js";
import { collectAlerts, alertsMarkdown } from "../lib/alerts.js";

test("gate REJECT blocks even an approved item", () => {
  const r = approvedContradiction({ payload: { compliance_gate: { verdict: "REJECT", reasons: ["banned claim"] } } });
  assert.match(r, /compliance gate REJECT/);
  assert.match(r, /banned claim/);
});

test("failed visual QA blocks even an approved item", () => {
  for (const qa of ["fail", "failed_auto"]) {
    const r = approvedContradiction({ payload: { visual_qa_status: qa } });
    assert.match(r, new RegExp(qa));
  }
});

test("clean and needs_review items are NOT contradictions (human approval is final)", () => {
  assert.equal(approvedContradiction({ payload: { compliance_gate: { verdict: "PASS" }, visual_qa_status: "pass" } }), null);
  assert.equal(approvedContradiction({ payload: { visual_qa_status: "needs_review" } }), null);
  assert.equal(approvedContradiction({ payload: {} }), null);
});

// ---- alerts ----

test("collectAlerts covers kill switch, stop-loss, blocked, rejects, renders, budget", () => {
  const alerts = collectAlerts({
    policy: { kill_switch: true, llm: { daily_budget_gbp: 5 } },
    todayStr: "2026-07-08",
    usageDay: { est_cost_gbp: 6.2 },
    stopLossFlags: [{ platform: "tiktok", campaign: "C1", campaign_id: "9", reason: "£45 spent, 0 conversions" }],
    blockedItems: ["video-blocked-product-spec"],
    rejectedToday: [{ id: "x1", reasons: ["clinically proven"] }],
    failedRenders: ["y1"],
  });
  const titles = alerts.map((a) => a.title).join(" | ");
  assert.match(titles, /Kill switch/);
  assert.match(titles, /Stop-loss/);
  assert.match(titles, /blocked/);
  assert.match(titles, /REJECT/);
  assert.match(titles, /Render failed/);
  assert.match(titles, /LLM budget exceeded/);
  assert.equal(alerts.filter((a) => a.level === "critical").length, 2);
});

test("quiet day → no alerts, empty markdown", () => {
  const alerts = collectAlerts({ policy: { kill_switch: false, llm: { daily_budget_gbp: 5 } }, usageDay: { est_cost_gbp: 1 } });
  assert.equal(alerts.length, 0);
  assert.equal(alertsMarkdown([], "2026-07-08"), "");
});

test("alertsMarkdown renders levels distinctly", () => {
  const md = alertsMarkdown([
    { level: "critical", title: "T1", detail: "D1" },
    { level: "warning", title: "T2", detail: "D2" },
  ], "2026-07-08");
  assert.match(md, /🔴 \*\*T1\*\*/);
  assert.match(md, /⚠️ \*\*T2\*\*/);
});
