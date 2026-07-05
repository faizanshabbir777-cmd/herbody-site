// PPC manager agent — Google/Meta/TikTok paid media (draft-only by default).
// Weekly: reviews performance + strategy → refreshed campaign specs (ALWAYS PAUSED),
// ad copy variants, keywords/negatives, budget recommendations. Emits Google Ads
// Editor CSV so paid search is actionable with ZERO API access.
import { structured, untrusted } from "./lib/claude.js";
import { readJson, writeJson, loadMemory, saveMemory, today } from "./lib/state.js";
import { putDraft } from "./lib/queue.js";

const MAX_BUDGET = parseFloat(process.env.MAX_DAILY_BUDGET_GBP || "25");

const CHARTER = `You are HerBody's PPC manager (UK) for Google Ads, Meta Ads and TikTok Ads.
Output campaign refreshes as STRUCTURED SPECS — every campaign/ad set/ad status is PAUSED,
budgets never exceed £${MAX_BUDGET}/day per channel. Campaign names follow HB_UK_* convention
and mirror UTMs. RSA rules: headlines ≤30 chars, descriptions ≤90 chars. No sensitive-health
targeting, no problem-calling copy ("struggling with…"), no results promises.
Only claims from the approved claims basis (studied dose facts, halal certified, price-per-day,
the pledge). British English, £.`;

const SCHEMA = {
  type: "object",
  required: ["google_search", "recommendations", "memory"],
  properties: {
    google_search: {
      type: "object",
      required: ["campaigns"],
      properties: {
        campaigns: {
          type: "array", minItems: 1, maxItems: 3,
          items: {
            type: "object",
            required: ["name", "daily_budget_gbp", "ad_groups"],
            properties: {
              name: { type: "string" },
              daily_budget_gbp: { type: "number" },
              ad_groups: {
                type: "array", minItems: 1, maxItems: 4,
                items: {
                  type: "object",
                  required: ["name", "keywords", "match_types", "headlines", "descriptions", "final_url"],
                  properties: {
                    name: { type: "string" },
                    keywords: { type: "array", items: { type: "string" } },
                    match_types: { type: "array", items: { type: "string", enum: ["exact", "phrase"] } },
                    negatives: { type: "array", items: { type: "string" } },
                    headlines: { type: "array", minItems: 8, maxItems: 15, items: { type: "string", maxLength: 30 } },
                    descriptions: { type: "array", minItems: 3, maxItems: 4, items: { type: "string", maxLength: 90 } },
                    final_url: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    meta_refresh: {
      type: "array", maxItems: 5,
      items: {
        type: "object",
        required: ["campaign", "change", "reason"],
        properties: { campaign: { type: "string" }, change: { type: "string" }, reason: { type: "string" } },
      },
    },
    tiktok_refresh: {
      type: "array", maxItems: 5,
      items: {
        type: "object",
        required: ["campaign", "change", "reason"],
        properties: { campaign: { type: "string" }, change: { type: "string" }, reason: { type: "string" } },
      },
    },
    ad_copy_bank: { type: "array", maxItems: 12, items: { type: "object", required: ["angle", "primary_text", "headline"], properties: { angle: { type: "string" }, primary_text: { type: "string" }, headline: { type: "string" }, compliance_status: { type: "string" } } } },
    recommendations: { type: "array", items: { type: "object", required: ["action", "reason", "requires_human"], properties: { action: { type: "string" }, reason: { type: "string" }, requires_human: { type: "boolean" } } } },
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

const mem = loadMemory("ppc");
const strategy = readJson("data/config/strategy.json", {});
const budgets = readJson("data/config/budgets.json", {});
const metrics = readJson("data/metrics/latest.json", {});

const user = `Date: ${today()} (idempotent run).
Mode: ${process.env.ADS_AUTOMATION_MODE || "draft_only"} — you produce PAUSED drafts and recommendations only.
Strategy: ${JSON.stringify(strategy)}
Budget allocation: ${JSON.stringify(budgets)}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
Refresh the Google Search campaign specs (paused), note Meta/TikTok changes worth making,
give an ad-copy bank refresh and clear recommendations (flag anything needing a human).`;

const { data, usage } = await structured({ charter: CHARTER, user, schema: SCHEMA, maxTokens: 16000 });

// ---- Google Ads Editor CSV (the zero-credential path) ----
function csvEscape(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
const rows = [];
const H = ["Campaign", "Campaign Daily Budget", "Campaign Status", "Ad Group", "Ad Group Status", "Keyword", "Match Type", "Criterion Type", "Status",
  ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`), "Final URL"];
rows.push(H.join(","));
for (const c of data.google_search.campaigns) {
  const budget = Math.min(c.daily_budget_gbp || 10, MAX_BUDGET);
  for (const g of c.ad_groups) {
    for (let k = 0; k < g.keywords.length; k++) {
      const mt = (g.match_types[k] || g.match_types[0] || "phrase");
      rows.push([c.name, budget, "Paused", g.name, "Paused", g.keywords[k], mt[0].toUpperCase() + mt.slice(1), "Keyword", "Paused",
        ...Array(15).fill(""), ...Array(4).fill(""), ""].map(csvEscape).join(","));
    }
    for (const n of g.negatives || []) {
      rows.push([c.name, budget, "Paused", g.name, "Paused", n, "Phrase", "Negative Keyword", "Paused",
        ...Array(15).fill(""), ...Array(4).fill(""), ""].map(csvEscape).join(","));
    }
    const hs = [...g.headlines]; while (hs.length < 15) hs.push("");
    const ds = [...g.descriptions]; while (ds.length < 4) ds.push("");
    rows.push([c.name, budget, "Paused", g.name, "Paused", "", "", "Responsive Search Ad", "Paused",
      ...hs.slice(0, 15), ...ds.slice(0, 4), g.final_url].map(csvEscape).join(","));
  }
}
import { writeFileSync, mkdirSync } from "node:fs";
import { repoPath } from "./lib/state.js";
mkdirSync(repoPath("data/ppc-export"), { recursive: true });
writeFileSync(repoPath(`data/ppc-export/hb_uk_google_search_${today()}.csv`), rows.join("\n") + "\n");

// ---- queue a weekly PPC review item for the dashboard ----
putDraft("ppc", {
  id: `${today()}-ppc-weekly-refresh`,
  platform: "ppc",
  type: "campaign",
  scheduled_for: today(),
  title: `PPC refresh ${today()} — ${data.google_search.campaigns.length} search campaign(s), ${data.recommendations.length} recommendation(s)`,
  compliance_status: "NEEDS_REVIEW",
  payload: data,
});
writeJson("data/state/ppc-latest-specs.json", { generated: today(), ...data });
saveMemory("ppc", { ...data.memory, agent: "ppc" });
console.log(`[ppc] specs refreshed · CSV data/ppc-export/hb_uk_google_search_${today()}.csv · tokens ${usage.input_tokens}/${usage.output_tokens}`);
