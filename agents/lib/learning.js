// Learning loop — the spine that makes the fleet improve on EVERY output.
//   Events  : every draft/verdict/decision/render/publish/performance becomes a
//             normalized, deduplicated event (derived from repo state — no agent
//             has to emit anything, and the dashboard stays a pure file writer).
//   Lessons : mechanical aggregation turns events into evidence-backed lessons
//             with a confidence lifecycle (confirm → decay → contradict → retire).
//   Actions : learned negative prompts, slot/pillar scheduling, experiments.
//   Meta    : rates that prove the loop works (or alert when it regresses).
// GUARDRAIL: learning writes ONLY advisory inputs. It can never touch compliance
// rules, the autonomy policy, budgets or gates — those change by human commit.
import { readJson, writeJson, listDir, today, nowIso, pruneMetrics } from "./state.js";

export const EVENTS_DIR = "data/learning/events";
export const LESSONS_PATH = "data/learning/lessons.json";
export const NEGATIVES_PATH = "data/learning/learned-negatives.json";
export const EXPERIMENTS_PATH = "data/learning/experiments.json";
export const HINTS_PATH = "data/learning/schedule-hints.json";
export const META_PATH = "data/metrics/learning/latest.json";

export const SLOTS = ["07:00-08:30", "12:00-13:00", "19:00-21:00"];

/** Bucket a free-text post time into one of the brand's three slots. */
export function slotOf(postTimeUk = "") {
  const m = String(postTimeUk).match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (h >= 6 && h < 10) return SLOTS[0];
  if (h >= 11 && h < 15) return SLOTS[1];
  if (h >= 18 && h < 22) return SLOTS[2];
  return null;
}

function tagsOf(payload = {}) {
  return {
    pillar: payload.pillar || null,
    hook_type: payload.hook_type || null,
    angle: payload.angle || null,
    slot: slotOf(payload.post_time_uk),
  };
}

/**
 * Derive today's normalized events from a state snapshot. Pure — injectable for
 * tests. Event ids are stable so daily re-runs deduplicate naturally.
 * @param {object} s { items:[queue items], approvals:[decisions], visualQa:[decisions],
 *                     published:[index entries], perfLabels:[labelled rows] }
 */
export function deriveEventsFrom(s = {}) {
  const events = [];
  const tagIndex = {};
  const push = (e) => events.push({ at: nowIso(), evidence: {}, ...e });

  for (const item of s.items || []) {
    const p = item.payload || {};
    const tags = tagsOf(p);
    tagIndex[item.id] = { tags, agent: item.agent, platform: item.platform };
    push({ id: `draft:${item.id}`, type: "draft_created", item_id: item.id, agent: item.agent, platform: item.platform, tags, signal: 0 });
    if (p.compliance_gate) {
      push({
        id: `gate:${item.id}:${p.compliance_gate.checked_at || "x"}`, type: "gate_verdict",
        item_id: item.id, agent: item.agent, platform: item.platform, tags,
        signal: p.compliance_gate.verdict === "REJECT" ? -1 : 0,
        evidence: { verdict: p.compliance_gate.verdict, reasons: p.compliance_gate.reasons || [] },
      });
    }
    if (p.editorial) {
      push({
        id: `editorial:${item.id}:${p.editorial.at || "x"}`, type: "editorial_verdict",
        item_id: item.id, agent: item.agent, platform: item.platform, tags,
        signal: p.editorial.verdict === "approved" ? 1 : -1,
        evidence: { verdict: p.editorial.verdict, notes: p.editorial.notes || "" },
      });
    }
    if (p.vision_qa?.verdict === "fail" || p.visual_qa_status === "failed_auto") {
      push({
        id: `vision:${item.id}`, type: "vision_fail", item_id: item.id, agent: item.agent, platform: item.platform, tags,
        signal: -1, evidence: { reasons: p.vision_qa?.reasons || [] },
      });
    }
    if (p.media_status === "failed") {
      push({ id: `render:${item.id}`, type: "render_failed", item_id: item.id, agent: item.agent, platform: item.platform, tags, signal: -1, evidence: { error: p.generation_error || "" } });
    }
  }

  const ctx = (id) => tagIndex[id] || { tags: {}, agent: null, platform: null };
  for (const d of s.approvals || []) {
    const c = ctx(d.id);
    push({
      id: `human:${d.id}:${d.at || "x"}`, type: "human_decision", item_id: d.id, agent: c.agent, platform: c.platform, tags: c.tags,
      signal: d.status === "approved" ? 1 : -1,
      evidence: { status: d.status, reasons: d.reasons || [], note: d.note || "" },
      at: d.at || nowIso(),
    });
  }
  for (const d of s.visualQa || []) {
    const c = ctx(d.id);
    push({
      id: `qa:${d.id}:${d.at || "x"}`, type: "visual_qa", item_id: d.id, agent: c.agent, platform: c.platform, tags: c.tags,
      signal: d.status === "pass" ? 1 : -1, evidence: { status: d.status }, at: d.at || nowIso(),
    });
  }
  for (const p of s.published || []) {
    const c = ctx(p.id);
    push({
      id: `publish:${p.id}`, type: "publish_outcome", item_id: p.id, agent: p.agent || c.agent, platform: p.platform, tags: c.tags,
      signal: 0, evidence: { mode: p.mode }, at: p.published_at || nowIso(),
    });
  }
  for (const r of s.perfLabels || []) {
    if (!r.creative_id) continue;
    const c = ctx(r.creative_id);
    push({
      id: `perf:${r.creative_id}:${s.todayStr || today()}`, type: "performance", item_id: r.creative_id,
      agent: c.agent, platform: r.platform || c.platform, tags: c.tags,
      signal: r.label === "winner" ? 1 : r.label === "reject" || r.label === "fatigue" ? -1 : 0,
      evidence: { label: r.label, impressions: r.impressions || 0, revenue_gbp: r.revenue_gbp || 0, utm_content: r.utm_content || "" },
    });
  }
  return events;
}

/** Load repo state and derive today's events (the collector's entry point). */
export function deriveEvents() {
  const idx = readJson("data/queue/index.json", { items: [] });
  const items = (idx.items || []).map((e) => readJson(e.path, null)).filter(Boolean);
  return deriveEventsFrom({
    items,
    approvals: readJson("data/approvals.json", { decisions: [] }).decisions || [],
    visualQa: readJson("data/visual-qa.json", { decisions: [] }).decisions || [],
    published: readJson("data/published/index.json", { items: [] }).items || [],
    perfLabels: readJson("data/state/creative-performance.json", { labels: [] }).labels || [],
    todayStr: today(),
  });
}

/** Append events to today's log, deduped by id across ALL stored days. */
export function recordEvents(events) {
  const seen = new Set();
  for (const f of listDir(EVENTS_DIR)) {
    if (!f.endsWith(".json")) continue;
    for (const e of readJson(`${EVENTS_DIR}/${f}`, { events: [] }).events || []) seen.add(e.id);
  }
  const fresh = events.filter((e) => !seen.has(e.id));
  if (fresh.length) {
    const path = `${EVENTS_DIR}/${today()}.json`;
    const doc = readJson(path, { events: [] });
    doc.events = [...(doc.events || []), ...fresh];
    writeJson(path, doc);
  }
  pruneMetrics(EVENTS_DIR);
  return fresh;
}

/** All stored events (optionally since an ISO date). */
export function loadEvents({ sinceIso = null } = {}) {
  const out = [];
  for (const f of listDir(EVENTS_DIR)) {
    if (!f.endsWith(".json")) continue;
    for (const e of readJson(`${EVENTS_DIR}/${f}`, { events: [] }).events || []) {
      if (!sinceIso || String(e.at || "") >= sinceIso) out.push(e);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Aggregation (mechanical, injection-safe: numbers only, no free text into LLMs)
// ---------------------------------------------------------------------------

const OUTCOME_TYPES = new Set(["human_decision", "performance"]);

/** Aggregate outcome events per tag dimension → { value: { pos, neg, n } }. */
export function aggregateByDimension(events, dim) {
  const out = {};
  for (const e of events) {
    if (!OUTCOME_TYPES.has(e.type)) continue;
    const v = e.tags?.[dim];
    if (!v) continue;
    const b = (out[v] ||= { pos: 0, neg: 0, n: 0 });
    b.n++;
    if (e.signal > 0) b.pos++;
    if (e.signal < 0) b.neg++;
  }
  return out;
}

/** Count strings (rejection reasons, vision-fail reasons…) → { text: count }. */
export function countStrings(events, picker) {
  const out = {};
  for (const e of events) {
    for (const s of picker(e) || []) {
      const t = String(s).trim().toLowerCase().slice(0, 120);
      if (t) out[t] = (out[t] || 0) + 1;
    }
  }
  return out;
}

export function aggregateEvents(events) {
  return {
    by_hook_type: aggregateByDimension(events, "hook_type"),
    by_pillar: aggregateByDimension(events, "pillar"),
    by_slot: aggregateByDimension(events, "slot"),
    rejection_reasons: countStrings(events.filter((e) => e.type === "human_decision" && e.signal < 0),
      (e) => [...(e.evidence?.reasons || []), ...(e.evidence?.note ? [e.evidence.note] : [])]),
    gate_reject_reasons: countStrings(events.filter((e) => e.type === "gate_verdict" && e.signal < 0),
      (e) => e.evidence?.reasons || []),
    vision_fail_reasons: countStrings(events.filter((e) => e.type === "vision_fail"),
      (e) => e.evidence?.reasons || []),
    editorial_needs_work_by_agent: events
      .filter((e) => e.type === "editorial_verdict" && e.signal < 0)
      .reduce((m, e) => ((m[e.agent || "?"] = (m[e.agent || "?"] || 0) + 1), m), {}),
  };
}

// ---------------------------------------------------------------------------
// Lessons — evidence-backed, with a confirm/decay/contradict/retire lifecycle
// ---------------------------------------------------------------------------

const MIN_SAMPLE = 3;
const EFFECT = 0.25;       // win-rate delta vs siblings to call it a lesson
const DECAY_DAYS = 21;     // unconfirmed lessons decay
const MAX_CONTRADICTIONS = 2;

const winRate = (b) => (b.pos + b.neg ? b.pos / (b.pos + b.neg) : null);

/** Derive today's candidate lessons from dimension aggregates (pure). */
export function candidateLessons(aggregates) {
  const out = [];
  for (const dim of ["hook_type", "pillar", "slot"]) {
    const buckets = aggregates[`by_${dim}`] || {};
    const rates = Object.entries(buckets)
      .map(([v, b]) => ({ v, b, rate: winRate(b) }))
      .filter((x) => x.rate !== null && x.b.pos + x.b.neg >= MIN_SAMPLE);
    if (rates.length < 2) continue;
    const overall = rates.reduce((s, x) => s + x.rate, 0) / rates.length;
    for (const x of rates) {
      const delta = x.rate - overall;
      if (Math.abs(delta) < EFFECT) continue;
      const dir = delta > 0 ? "up" : "down";
      out.push({
        id: `${dim}:${x.v}:${dir}`,
        scope: { dimension: dim, value: x.v },
        direction: dir,
        statement: dir === "up"
          ? `${dim} "${x.v}" outperforms (win rate ${Math.round(x.rate * 100)}% vs ${Math.round(overall * 100)}% average) — make more of it`
          : `${dim} "${x.v}" underperforms (win rate ${Math.round(x.rate * 100)}% vs ${Math.round(overall * 100)}% average) — retire this angle`,
        evidence: { pos: x.b.pos, neg: x.b.neg, n: x.b.n, win_rate: Math.round(x.rate * 100) / 100, baseline: Math.round(overall * 100) / 100 },
        confidence: Math.min(0.95, Math.round((Math.abs(delta) * Math.min(1, (x.b.pos + x.b.neg) / 10)) * 100) / 100 + 0.3),
      });
    }
  }
  return out;
}

/** Merge today's candidates into the store: confirm / contradict / decay / retire (pure). */
export function updateLessons(store = { lessons: [] }, candidates = [], todayStr = today()) {
  const lessons = [...(store.lessons || [])];
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const opposite = (id) => id.endsWith(":up") ? id.replace(/:up$/, ":down") : id.replace(/:down$/, ":up");

  for (const c of candidates) {
    const existing = byId.get(c.id);
    if (existing) {
      existing.statement = c.statement;
      existing.evidence = c.evidence;
      existing.confidence = Math.min(0.95, Math.max(existing.confidence, c.confidence) + 0.05);
      existing.last_confirmed = todayStr;
      if (existing.status === "decayed") existing.status = "active";
    } else {
      const fresh = { ...c, status: "active", created: todayStr, last_confirmed: todayStr, contradictions: 0 };
      lessons.push(fresh);
      byId.set(c.id, fresh);
    }
    // A reversed direction contradicts the opposite lesson.
    const opp = byId.get(opposite(c.id));
    if (opp && opp.status !== "retired") {
      opp.contradictions = (opp.contradictions || 0) + 1;
      if (opp.contradictions >= MAX_CONTRADICTIONS) opp.status = "retired";
    }
  }
  // Decay lessons that stopped being confirmed.
  const cutoff = new Date(new Date(todayStr).getTime() - DECAY_DAYS * 864e5).toISOString().slice(0, 10);
  for (const l of lessons) {
    if (l.status === "active" && String(l.last_confirmed || l.created) < cutoff) l.status = "decayed";
  }
  return { updated: todayStr, lessons };
}

/** Which lessons matter to a given agent (advisory prompt input). */
export function lessonsForAgent(store = { lessons: [] }, agent) {
  const relevantDims = agent === "image" ? ["pillar", "slot"] : ["hook_type", "pillar", "slot"];
  return (store.lessons || [])
    .filter((l) => l.status === "active" && relevantDims.includes(l.scope?.dimension))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 8)
    .map((l) => ({ statement: l.statement, confidence: l.confidence, evidence: l.evidence }));
}

// ---------------------------------------------------------------------------
// Actions — learned negatives, slot/pillar scheduling, experiments
// ---------------------------------------------------------------------------

/** Grow the learned negative-prompt library from vision failures (bounded). */
export function updateLearnedNegatives(store = { phrases: [] }, visionFailReasons = {}, todayStr = today(), cap = 20) {
  const phrases = [...(store.phrases || [])];
  const have = new Set(phrases.map((p) => p.text));
  for (const [text, count] of Object.entries(visionFailReasons)) {
    if (have.has(text)) {
      const p = phrases.find((x) => x.text === text);
      p.count = (p.count || 1) + 0; // counts are re-derived; keep latest
      p.count = count;
    } else {
      phrases.push({ text, count, added: todayStr });
    }
  }
  phrases.sort((a, b) => (b.count || 0) - (a.count || 0));
  return { updated: todayStr, phrases: phrases.slice(0, cap) };
}

/** Epsilon-greedy chooser over slot/pillar performance. */
export function chooseByPerformance(buckets = {}, candidates = [], { epsilon = 0.2, rand = Math.random } = {}) {
  const pool = candidates.length ? candidates : Object.keys(buckets);
  if (!pool.length) return { choice: null, exploration: false };
  if (rand() < epsilon) {
    return { choice: pool[Math.floor(rand() * pool.length)], exploration: true };
  }
  let best = pool[0], bestRate = -1;
  for (const c of pool) {
    const b = buckets[c];
    const r = b && b.pos + b.neg ? b.pos / (b.pos + b.neg) : 0.5; // unknown = neutral prior
    if (r > bestRate) { bestRate = r; best = c; }
  }
  return { choice: best, exploration: false };
}

/**
 * Experiment registry: register open A/B variant groups, resolve them from the
 * performance loop's comparisons, and propose the next hypothesis from the
 * least-sampled dimension value (pure).
 */
export function updateExperiments(registry = { experiments: [] }, { variantGroups = [], comparisons = [], aggregates = {}, todayStr = today() } = {}) {
  const experiments = [...(registry.experiments || [])];
  const byId = new Map(experiments.map((e) => [e.id, e]));
  for (const g of variantGroups) {
    if (!byId.has(g.group)) {
      const fresh = { id: g.group, hypothesis: g.hypothesis || `hook A/B test for ${g.group}`, variants: g.variants || [], status: "open", created: todayStr };
      experiments.push(fresh);
      byId.set(g.group, fresh);
    }
  }
  for (const c of comparisons) {
    // Variants are stored as full UTM strings; the comparison base is the bare
    // utm_content token — substring match joins them.
    const exp = experiments.find((e) => e.status === "open" && (e.id === c.base || (e.variants || []).some((v) => String(v).includes(c.base))));
    if (exp) {
      exp.status = "resolved";
      exp.leader = c.leader;
      exp.result = c.recommendation;
      exp.resolved_at = todayStr;
    }
  }
  // Next hypothesis: the hook_type with the least outcome data is the biggest open question.
  const buckets = aggregates.by_hook_type || {};
  const known = ["question", "statement", "statistic", "pattern-interrupt", "demo"];
  let least = null, leastN = Infinity;
  for (const k of known) {
    const n = buckets[k]?.n || 0;
    if (n < leastN) { least = k; leastN = n; }
  }
  const proposal = least ? `Test "${least}" hooks next — only ${leastN} outcome(s) recorded for that hook type.` : null;
  return { updated: todayStr, experiments: experiments.slice(-50), next_hypothesis: proposal };
}

// ---------------------------------------------------------------------------
// Meta-metrics — is the loop actually improving the system?
// ---------------------------------------------------------------------------

const rate = (events, type, badSignal = -1) => {
  const rel = events.filter((e) => e.type === type && e.signal !== 0);
  if (!rel.length) return null;
  return Math.round((rel.filter((e) => e.signal === badSignal).length / rel.length) * 100) / 100;
};

/** Compute failure/success rates for a window of events (pure). */
export function windowRates(events) {
  return {
    human_rejection_rate: rate(events, "human_decision"),
    gate_reject_rate: (() => {
      const g = events.filter((e) => e.type === "gate_verdict");
      return g.length ? Math.round((g.filter((e) => e.signal < 0).length / g.length) * 100) / 100 : null;
    })(),
    qa_fail_rate: (() => {
      const q = events.filter((e) => e.type === "visual_qa" || e.type === "vision_fail");
      return q.length ? Math.round((q.filter((e) => e.signal < 0).length / q.length) * 100) / 100 : null;
    })(),
    editorial_needs_work_rate: rate(events, "editorial_verdict"),
    winner_rate: (() => {
      const p = events.filter((e) => e.type === "performance" && e.signal !== 0);
      return p.length ? Math.round((p.filter((e) => e.signal > 0).length / p.length) * 100) / 100 : null;
    })(),
    events: events.length,
  };
}

/** 7d vs prior-7d comparison; regressions = bad rates rising >10pts (pure). */
export function metaMetrics(events, nowIso_ = nowIso()) {
  const nowMs = new Date(nowIso_).getTime();
  const winOf = (fromDays, toDays) => events.filter((e) => {
    const t = new Date(e.at || 0).getTime();
    return t > nowMs - fromDays * 864e5 && t <= nowMs - toDays * 864e5;
  });
  const last7 = windowRates(winOf(7, 0));
  const prev7 = windowRates(winOf(14, 7));
  const last28 = windowRates(winOf(28, 0));
  const regressions = [];
  const badRising = ["human_rejection_rate", "gate_reject_rate", "qa_fail_rate", "editorial_needs_work_rate"];
  for (const k of badRising) {
    if (last7[k] != null && prev7[k] != null && last7[k] - prev7[k] > 0.1) {
      regressions.push({ metric: k, from: prev7[k], to: last7[k] });
    }
  }
  if (last7.winner_rate != null && prev7.winner_rate != null && prev7.winner_rate - last7.winner_rate > 0.1) {
    regressions.push({ metric: "winner_rate", from: prev7.winner_rate, to: last7.winner_rate });
  }
  return { updated: nowIso_, last7, prev7, last28, regressions };
}
