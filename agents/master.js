// MASTER agent — the orchestrator. Runs LAST in the daily fleet so it sees fresh output.
// Daily: brief (KPIs, wins, issues, actions for the owner, per-agent notes).
// Weekly (--weekly): strategy + budget allocation refresh.
import { structured, untrusted } from "./lib/claude.js";
import { readJson, writeJson, loadMemory, saveMemory, today, upsertIndex } from "./lib/state.js";

const WEEKLY = process.argv.includes("--weekly");
const MAX_BUDGET = parseFloat(process.env.MAX_DAILY_BUDGET_GBP || "25");

const CHARTER = `You are the MASTER agent — HerBody's head of growth and the founder's chief of staff.
You read every other agent's state and output plus store/ads metrics, then:
${WEEKLY
  ? `WEEKLY MODE: set next week's strategy (focus themes per channel, what to double down on,
what to stop), allocate budgets across channels (total cap £${MAX_BUDGET}/day/channel — recommend
splits, never exceed caps), and flag structural issues.`
  : `DAILY MODE: write the morning brief a busy founder reads in 3 minutes: KPIs, what went well,
issues (including agents that missed runs — check last_run dates), the 3–5 actions only a human
can do today, and one-line notes per agent.`}
Be specific and numeric where data exists; honest about gaps where it doesn't (pre-launch = say so).
Never invent metrics. British English.`;

const DAILY_SCHEMA = {
  type: "object",
  required: ["brief", "memory"],
  properties: {
    brief: {
      type: "object",
      required: ["date", "kpis", "wins", "issues", "actions_for_owner", "per_agent_notes"],
      properties: {
        date: { type: "string" },
        kpis: { type: "object", additionalProperties: true },
        wins: { type: "array", items: { type: "string" } },
        issues: { type: "array", items: { type: "string" } },
        actions_for_owner: { type: "array", items: { type: "string" } },
        per_agent_notes: {
          type: "object",
          properties: {
            tiktok: { type: "string" }, social: { type: "string" }, ppc: { type: "string" },
            video: { type: "string" }, image: { type: "string" }, paid: { type: "string" },
          },
        },
        summary_md: { type: "string", description: "the whole brief as tight markdown" },
      },
    },
    memory: {
      type: "object",
      required: ["recent_actions", "learnings", "rolling_summary"],
      properties: {
        recent_actions: { type: "array", items: { type: "string" } },
        learnings: { type: "array", items: { type: "string" } },
        rolling_summary: { type: "string" },
      },
    },
  },
};

const WEEKLY_SCHEMA = {
  type: "object",
  required: ["strategy", "budgets", "weekly_brief", "memory"],
  properties: {
    strategy: {
      type: "object",
      required: ["focus", "channel_priorities"],
      properties: {
        focus: { type: "array", items: { type: "string" } },
        channel_priorities: { type: "object", additionalProperties: true },
        stop_doing: { type: "array", items: { type: "string" } },
        experiments: { type: "array", items: { type: "string" } },
      },
    },
    budgets: {
      type: "object",
      required: ["allocation"],
      properties: {
        allocation: { type: "object", additionalProperties: true },
        rationale: { type: "string" },
      },
    },
    weekly_brief: { type: "string", description: "markdown summary of the week + next week plan" },
    memory: {
      type: "object",
      required: ["recent_actions", "learnings", "rolling_summary"],
      properties: {
        recent_actions: { type: "array", items: { type: "string" } },
        learnings: { type: "array", items: { type: "string" } },
        rolling_summary: { type: "string" },
      },
    },
  },
};

const mem = loadMemory("master");
const states = Object.fromEntries(
  ["tiktok", "social", "video", "image", "ppc", "paid"].map((a) => [a, readJson(`data/state/${a}.json`, {})])
);
const creativePerf = readJson("data/state/creative-performance.json", {});
const shopReadiness = readJson("data/state/tiktok-shop-readiness.json", {});
const anthropicUsage = readJson("data/state/anthropic-usage.json", {});
const learningMeta = readJson("data/metrics/learning/latest.json", {});
const lessonsDoc = readJson("data/learning/lessons.json", { lessons: [] });
const activeLessons = (lessonsDoc.lessons || []).filter((l) => l.status === "active").slice(0, 8)
  .map((l) => ({ statement: l.statement, confidence: l.confidence }));
const experimentsDoc = readJson("data/learning/experiments.json", {});
const queue = readJson("data/queue/index.json", { items: [] });
const published = readJson("data/published/index.json", { items: [] });
const approvals = readJson("data/approvals.json", { decisions: [] });
const metrics = readJson("data/metrics/latest.json", {});
const strategy = readJson("data/config/strategy.json", {});

const pendingIds = new Set(queue.items.map((i) => i.id));
for (const d of approvals.decisions) pendingIds.delete(d.id);
for (const p of published.items || []) pendingIds.delete(p.id);

const user = `Date: ${today()}. Mode: ${WEEKLY ? "WEEKLY" : "DAILY"}.
Current strategy: ${JSON.stringify(strategy)}
Agent states (check last_run for missed runs): ${JSON.stringify(states)}
Queue: ${queue.items.length} items total, ${pendingIds.size} awaiting human decision.
Published (last 10): ${JSON.stringify((published.items || []).slice(-10))}
Creative performance labels (latest): ${JSON.stringify((creativePerf.labels || []).slice(0, 10))}
TikTok Shop readiness: ${JSON.stringify(shopReadiness.blockers ? { approved: shopReadiness.approved, blockers: shopReadiness.blockers.length } : shopReadiness)}
Anthropic usage (tokens by date): ${JSON.stringify(anthropicUsage.dates ? Object.fromEntries(Object.entries(anthropicUsage.dates).slice(-3)) : {})}
LEARNING LOOP — 7d rates vs previous 7d (brief on what the fleet learned + what it's testing): ${JSON.stringify({ last7: learningMeta.last7, prev7: learningMeta.prev7, regressions: learningMeta.regressions })}
Active lessons: ${JSON.stringify(activeLessons)}
Experiments: ${JSON.stringify({ open: (experimentsDoc.experiments || []).filter((e) => e.status === "open").slice(0, 3), next: experimentsDoc.next_hypothesis || null })}
${lessonsDoc.weekly_narrative ? `Learning analyst's weekly narrative: ${JSON.stringify(lessonsDoc.weekly_narrative)}` : ""}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
${WEEKLY ? "Set next week's strategy, budgets and the weekly brief." : "Write today's brief."}`;

const { data, usage } = await structured({
  charter: CHARTER,
  user,
  schema: WEEKLY ? WEEKLY_SCHEMA : DAILY_SCHEMA,
});

if (WEEKLY) {
  writeJson("data/config/strategy.json", { generated: today(), ...data.strategy });
  // clamp all budget numbers to the cap
  const alloc = data.budgets.allocation || {};
  for (const k of Object.keys(alloc)) {
    if (typeof alloc[k] === "number") alloc[k] = Math.min(alloc[k], MAX_BUDGET);
  }
  writeJson("data/config/budgets.json", {
    generated: today(), currency: "GBP", max_daily_budget_gbp: MAX_BUDGET,
    allocation: alloc, rationale: data.budgets.rationale || "",
  });
  writeJson(`data/briefs/${today()}-weekly.json`, { date: today(), type: "weekly", brief_md: data.weekly_brief });
  upsertIndex("data/briefs/index.json", "dates", `${today()}-weekly`);
  console.log(`[master] weekly strategy + budgets written · tokens ${usage.input_tokens}/${usage.output_tokens}`);
} else {
  writeJson(`data/briefs/${today()}.json`, { type: "daily", ...data.brief, date: today() });
  upsertIndex("data/briefs/index.json", "dates", today());
  console.log(`[master] daily brief written · ${data.brief.issues.length} issue(s) · tokens ${usage.input_tokens}/${usage.output_tokens}`);
}
saveMemory("master", { ...data.memory, agent: "master" });
