// Notify — surfaces critical fleet events as ONE GitHub issue ("Fleet alerts",
// label fleet-alert) so the founder hears about them without opening the
// dashboard. Runs last in the fleet. Degrades silently without GITHUB_TOKEN.
// Read scope: repo state only. Write scope: GitHub issues only.
import { readJson, today } from "./lib/state.js";
import { queueItems } from "./lib/queue.js";
import { loadAutonomy } from "./lib/autonomy.js";
import { collectAlerts, alertsMarkdown } from "./lib/alerts.js";

const TOKEN = process.env.GITHUB_TOKEN?.trim();
const REPO = process.env.GITHUB_REPOSITORY?.trim(); // owner/name — set automatically on Actions

const policy = loadAutonomy();
const usage = readJson("data/state/anthropic-usage.json", { dates: {} });
const paidState = readJson("data/state/paid-growth-latest.json", {});

const items = queueItems();
const blockedItems = items
  .filter(({ item }) => item.payload?.media_status === "blocked_missing_product_spec")
  .map(({ item }) => item.id);
// The fleet's day boundary is Europe/London (state.js today()) — convert the
// UTC checked_at stamp into a UK date before comparing.
const ukDateOf = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const rejectedToday = items
  .filter(({ item }) => item.payload?.compliance_gate?.verdict === "REJECT"
    && ukDateOf(item.payload.compliance_gate.checked_at) === today())
  .map(({ item }) => ({ id: item.id, reasons: item.payload.compliance_gate.reasons }));
const failedRenders = items
  .filter(({ item }) => item.payload?.media_status === "failed")
  .map(({ item }) => item.id);

const alerts = collectAlerts({
  policy,
  todayStr: today(),
  usageDay: usage.dates?.[today()],
  stopLossFlags: paidState.stop_loss_flags || [],
  blockedItems,
  rejectedToday,
  failedRenders,
});

if (!alerts.length) {
  console.log("[notify] no alerts — quiet day");
  process.exit(0);
}
const body = alertsMarkdown(alerts, today());
console.log(`[notify] ${alerts.length} alert(s):\n${body}`);

if (!TOKEN || !REPO) {
  console.log("[notify] no GITHUB_TOKEN/GITHUB_REPOSITORY — alerts logged only");
  process.exit(0);
}

const gh = async (path, opts = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} ${path}`);
  return res.json();
};

try {
  const open = await gh(`/repos/${REPO}/issues?state=open&labels=fleet-alert&per_page=1`);
  if (open.length) {
    await gh(`/repos/${REPO}/issues/${open[0].number}/comments`, {
      method: "POST", body: JSON.stringify({ body }),
    });
    console.log(`[notify] commented on existing alerts issue #${open[0].number}`);
  } else {
    const issue = await gh(`/repos/${REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: "🚨 Fleet alerts",
        body: `${body}\n\n---\n*This issue is maintained by the fleet's notify agent. Close it once handled — a new one opens when fresh alerts appear.*`,
        labels: ["fleet-alert"],
      }),
    });
    console.log(`[notify] opened alerts issue #${issue.number}`);
  }
} catch (e) {
  console.log(`[notify] GitHub notification failed (alerts logged above): ${String(e.message).slice(0, 160)}`);
}
