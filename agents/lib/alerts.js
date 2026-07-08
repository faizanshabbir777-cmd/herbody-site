// Alert collection — pure logic that decides which conditions the founder must
// hear about without opening the dashboard. notify.js turns these into one
// GitHub issue comment; nothing here has side effects.

/**
 * @param {object} s snapshot {
 *   policy, todayStr, usageDay { est_cost_gbp }, stopLossFlags [],
 *   blockedItems [ids], rejectedToday [ { id, reasons } ], failedRenders [ids]
 * }
 * @returns [ { level: "critical"|"warning", title, detail } ]
 */
export function collectAlerts(s = {}) {
  const alerts = [];
  if (s.policy?.kill_switch === true) {
    alerts.push({ level: "critical", title: "Kill switch is ACTIVE", detail: "All automatic generation, posting and ad scaling is halted. Flip data/config/autonomy.json → kill_switch to false (or use the dashboard toggle) to resume." });
  }
  for (const f of s.stopLossFlags || []) {
    alerts.push({ level: "critical", title: `Stop-loss: ${f.platform} campaign ${f.campaign}`, detail: `${f.reason}. ${f.campaign_id ? "Run ppc-push with enforce_stop_loss:true to pause it via API, or pause manually." : "No campaign id captured — pause manually in Ads Manager."}` });
  }
  for (const id of s.blockedItems || []) {
    alerts.push({ level: "warning", title: `Creative generation blocked (${id})`, detail: "The product visual spec is incomplete or no approved reference assets exist — see the checklist on the queue item." });
  }
  for (const r of s.rejectedToday || []) {
    alerts.push({ level: "warning", title: `Compliance gate REJECT: ${r.id}`, detail: (r.reasons || []).join(" · ").slice(0, 300) });
  }
  for (const id of s.failedRenders || []) {
    alerts.push({ level: "warning", title: `Render failed (${id})`, detail: "The generation provider reported a failed job — the draft stays queued without media." });
  }
  const budget = s.policy?.llm?.daily_budget_gbp;
  const spent = s.usageDay?.est_cost_gbp || 0;
  if (budget && spent >= budget) {
    alerts.push({ level: "warning", title: `LLM budget exceeded (£${spent} ≥ £${budget})`, detail: "Today's estimated Anthropic spend passed the daily budget in data/config/autonomy.json → llm.daily_budget_gbp." });
  }
  for (const r of s.learningRegressions || []) {
    alerts.push({ level: "warning", title: `Learning regression: ${r.metric}`, detail: `7-day ${r.metric} moved from ${r.from} to ${r.to} — the loop is trending the wrong way; review recent lessons and rejected drafts.` });
  }
  return alerts;
}

/** Render alerts as a markdown comment body. */
export function alertsMarkdown(alerts = [], todayStr = "") {
  if (!alerts.length) return "";
  const lines = [`### Fleet alerts — ${todayStr}`, ""];
  for (const a of alerts) {
    lines.push(`- ${a.level === "critical" ? "🔴" : "⚠️"} **${a.title}** — ${a.detail}`);
  }
  return lines.join("\n");
}
