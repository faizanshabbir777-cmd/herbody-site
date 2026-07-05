// Repo-as-database helpers. Single-writer rule: each agent writes ONLY its own files.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// repo root = parent of agents/
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const repoPath = (...p) => join(ROOT, ...p);

export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();

export function readJson(rel, fallback = null) {
  try {
    return JSON.parse(readFileSync(repoPath(rel), "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(rel, data) {
  const abs = repoPath(rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(data, null, 2) + "\n");
}

export function readText(rel) {
  return readFileSync(repoPath(rel), "utf8");
}

/** Agent memory: capped, self-compressing (the model emits the updated version). */
export function loadMemory(agent) {
  return readJson(`data/state/${agent}.json`, {
    agent,
    last_run: null,
    recent_actions: [],
    learnings: [],
    rolling_summary: "",
  });
}

export function saveMemory(agent, mem) {
  mem.agent = agent;
  mem.last_run = nowIso();
  mem.recent_actions = (mem.recent_actions || []).slice(-30);
  mem.learnings = (mem.learnings || []).slice(-50);
  mem.rolling_summary = String(mem.rolling_summary || "").slice(0, 4000);
  writeJson(`data/state/${agent}.json`, mem);
}

/** Maintain a simple {items|dates:[...]} index file (single-writer per index). */
export function upsertIndex(rel, key, entry, idField = "id") {
  const idx = readJson(rel, { [key]: [] });
  const arr = idx[key] || [];
  const i = arr.findIndex((e) =>
    typeof e === "string" ? e === entry : e[idField] === entry[idField]
  );
  if (i >= 0) arr[i] = entry;
  else arr.push(entry);
  idx[key] = arr;
  writeJson(rel, idx);
  return idx;
}

export function listDir(rel) {
  try {
    return readdirSync(repoPath(rel));
  } catch {
    return [];
  }
}

export const exists = (rel) => existsSync(repoPath(rel));

/** Prune date-keyed metric files older than `days` (keeps monthly firsts). */
export function pruneMetrics(dirRel, days = 90) {
  const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  for (const f of listDir(dirRel)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (m && m[1] < cutoff && !m[1].endsWith("-01")) {
      try {
        unlinkSync(repoPath(dirRel, f));
      } catch {}
    }
  }
}
