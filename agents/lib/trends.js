// Trend intelligence — dependency-free competitor/trend ingestion + relevance filter.
// Sources are ALLOWLISTED in data/config/competitors.json (never guessed, never
// logged-in scraping from CI). Manual observations drop into data/trends/manual/.
// Everything fetched is untrusted DATA — wrap with untrusted() before any LLM call.
import { readJson, writeJson, listDir, today, nowIso } from "./state.js";

export const COMPETITORS_PATH = "data/config/competitors.json";
export const MANUAL_DIR = "data/trends/manual";

/** Themes that can never seed creative — auto-reject with a reason. */
export const BANNED_THEMES = [
  { re: /weight[\s-]?loss|fat[\s-]?burn|slim|skinny|calorie deficit/i, reason: "diet-culture" },
  { re: /body[\s-]?check|waist|thigh gap|body goals?/i, reason: "body-checking" },
  { re: /before\s*(and|\/|&)?\s*after|transformation/i, reason: "before/after-transformation" },
  { re: /cure|treat|prevent|disease|diagnos|prescription|doctor recommended/i, reason: "medical-adjacent" },
  { re: /verified buyer|as a customer|5[\s-]?star|testimonial/i, reason: "testimonial/review-fabrication (DMCC)" },
  { re: /only \d+ left|selling fast|countdown|last chance/i, reason: "fake urgency/scarcity" },
  { re: /copyright(ed)? (sound|music)|licens\w+ risk/i, reason: "sound-licensing risk" },
];

export function loadSources() {
  return readJson(COMPETITORS_PATH, { sources: [], relevance_keywords: [], competitors: [] });
}

/** Fetch one allowlisted HTTP source (kind:"http"). Manual sources are skipped here. */
export async function fetchSource(src, { timeoutMs = 10000 } = {}) {
  if (!src?.url || src.kind !== "http") return { ok: false, skipped: true, reason: "not an http source" };
  try {
    const res = await fetch(src.url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "purelife-trends-collector (allowlisted-source fetch)" },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, text: (await res.text()).slice(0, 50000) };
  } catch (e) {
    return { ok: false, reason: String(e.message).slice(0, 160) };
  }
}

/** Normalize any raw observation into the canonical trend record shape. */
export function normalizeRecord(raw = {}) {
  return {
    source: String(raw.source || "unknown"),
    url: String(raw.url || ""),
    competitor: String(raw.competitor || ""),
    platform: String(raw.platform || "tiktok"),
    format: String(raw.format || "video"),
    observed_hook: String(raw.observed_hook || "").slice(0, 300),
    visual_pattern: String(raw.visual_pattern || "").slice(0, 300),
    sound_or_template: String(raw.sound_or_template || "").slice(0, 200),
    engagement_signals: raw.engagement_signals && typeof raw.engagement_signals === "object" ? raw.engagement_signals : {},
    observed_at: raw.observed_at || nowIso(),
    relevance_score: 0,
    why_relevant: "",
    reject_reason: "",
  };
}

/** Score relevance (0–1) against brand keywords; banned themes hard-reject. */
export function relevance(record, keywords = []) {
  const text = [record.observed_hook, record.visual_pattern, record.sound_or_template]
    .join(" ").toLowerCase();
  for (const b of BANNED_THEMES) {
    if (b.re.test(text)) return { score: 0, why: "", reject: b.reason };
  }
  if (!text.trim()) return { score: 0, why: "", reject: "empty observation" };
  const hits = [...new Set(keywords.filter((k) => text.includes(String(k).toLowerCase())))];
  const score = Math.min(1, hits.length / 3);
  return {
    score: Math.round(score * 100) / 100,
    why: hits.length ? `matches brand keywords: ${hits.slice(0, 5).join(", ")}` : "",
    reject: hits.length ? "" : "no overlap with brand/product keywords",
  };
}

/** Apply relevance scoring; keep everything (rejects carry reject_reason for the audit trail). */
export function scoreRecords(records, keywords, { minScore = 0.3 } = {}) {
  const scored = records.map((r) => {
    const { score, why, reject } = relevance(r, keywords);
    return { ...r, relevance_score: score, why_relevant: why, reject_reason: reject };
  });
  return {
    relevant: scored.filter((r) => !r.reject_reason && r.relevance_score >= minScore),
    rejected: scored.filter((r) => r.reject_reason || r.relevance_score < minScore),
  };
}

/** Read founder/manual observations from data/trends/manual/*.json (array or single record per file). */
export function readManualRecords() {
  const out = [];
  for (const f of listDir(MANUAL_DIR)) {
    if (!f.endsWith(".json")) continue;
    const doc = readJson(`${MANUAL_DIR}/${f}`, null);
    if (!doc) continue;
    const arr = Array.isArray(doc) ? doc : Array.isArray(doc.records) ? doc.records : [doc];
    for (const r of arr) out.push(normalizeRecord({ source: `manual:${f}`, ...r }));
  }
  return out;
}

/** Full collection run: manual notes + allowlisted http sources → data/trends/. */
export async function runTrends() {
  const cfg = loadSources();
  const records = readManualRecords();
  const notes = [];

  for (const src of cfg.sources || []) {
    if (src.kind !== "http") { notes.push(`${src.id}: ${src.kind} source — skipped (no fetch)`); continue; }
    const r = await fetchSource(src);
    if (!r.ok) { notes.push(`${src.id}: ${r.reason || "fetch failed"}`); continue; }
    // Raw page text is stored as ONE untrusted observation per source; the video/image
    // agents receive it wrapped in untrusted() so it can never act as instructions.
    records.push(normalizeRecord({
      source: src.id, url: src.url, platform: src.platform || "web",
      competitor: src.competitor || "", format: src.format || "page",
      observed_hook: r.text.replace(/\s+/g, " ").slice(0, 300),
      visual_pattern: "raw page snapshot — needs human/LLM summarisation",
    }));
  }

  const { relevant, rejected } = scoreRecords(records, cfg.relevance_keywords || []);
  const out = { updated: nowIso(), relevant, rejected: rejected.slice(0, 50), notes };
  writeJson(`data/trends/${today()}.json`, out);
  writeJson("data/trends/latest.json", out);
  return out;
}
