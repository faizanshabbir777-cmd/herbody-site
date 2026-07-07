// Creative performance labeller — mechanical (no LLM). Reads the creative metric
// rollup, labels every creative winner/promising/fatigue/reject against the
// autonomy winner thresholds, and writes labels for the video/image producers
// (feedback) and the paid-scaling agents (promotion candidates).
import { readJson, writeJson, nowIso, today } from "./lib/state.js";
import { loadAutonomy } from "./lib/autonomy.js";
import { labelAll, paidTestCandidates } from "./lib/performance.js";

const policy = loadAutonomy();
const creative = readJson("data/metrics/creative/latest.json", { rows: [] });

const labelled = labelAll(creative.rows || [], policy.winner_thresholds);
const winners = paidTestCandidates(labelled);

writeJson("data/state/creative-performance.json", {
  updated: nowIso(),
  date: today(),
  thresholds: policy.winner_thresholds,
  labels: labelled.map((r) => ({
    creative_id: r.creative_id,
    post_id: r.post_id,
    platform: r.platform,
    asset_type: r.asset_type,
    hook: r.hook,
    trend_basis: r.trend_basis,
    utm_content: r.utm_content,
    media_url: r.media_url || null,
    visual_qa_status: r.visual_qa_status || null,
    compliance_status: r.compliance_status || null,
    product_spec_version: r.product_spec_version || null,
    impressions: r.impressions,
    label: r.label,
    reason: r.reason,
    recommended_action: r.recommended_action,
  })),
  winners: winners.map((w) => w.creative_id || w.post_id),
});

const counts = labelled.reduce((m, r) => ((m[r.label] = (m[r.label] || 0) + 1), m), {});
console.log(
  `[creative-performance] ${labelled.length} creative(s) labelled · ` +
  `${counts.winner || 0} winner / ${counts.promising || 0} promising / ${counts.fatigue || 0} fatigue / ${counts.reject || 0} reject`
);
