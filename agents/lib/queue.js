// Approval-queue contract shared by agents (writers), dashboard (approver) and publisher.
// Queue item: data/queue/<agent>/<id>.json  →  indexed in data/queue/index.json
// Decisions: data/approvals.json (dashboard-only writer)
// Published: data/published/<id>.json + data/published/index.json (publisher-only writer)
import { readJson, writeJson, listDir, today, nowIso } from "./state.js";

export function makeId(agent, slug) {
  const s = String(slug).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
  return `${today()}-${agent}-${s}`;
}

/** Write/overwrite a draft (idempotent per id) and update the shared queue index. */
export function putDraft(agent, item) {
  const id = item.id || makeId(agent, item.title || item.type || "draft");
  const full = {
    id,
    agent,
    platform: item.platform || agent,
    type: item.type || "post",
    created: item.created || nowIso(),
    scheduled_for: item.scheduled_for || today(),
    title: item.title || id,
    compliance_status: item.compliance_status || "NEEDS_REVIEW",
    payload: item.payload || {},
  };
  const path = `data/queue/${agent}/${id}.json`;
  writeJson(path, full);
  // index (agents append their own items; last write wins per id)
  const idx = readJson("data/queue/index.json", { items: [] });
  const entry = {
    id,
    agent,
    platform: full.platform,
    type: full.type,
    created: full.created,
    scheduled_for: full.scheduled_for,
    title: full.title,
    path,
  };
  const i = idx.items.findIndex((e) => e.id === id);
  if (i >= 0) idx.items[i] = entry;
  else idx.items.push(entry);
  writeJson("data/queue/index.json", idx);
  return full;
}

const normTitle = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Today's queue items for an agent — producers use this to avoid duplicates. */
export function todaysItems(agent) {
  const idx = readJson("data/queue/index.json", { items: [] });
  return (idx.items || []).filter((e) => e.agent === agent && e.scheduled_for === today());
}

/** True if the agent already queued a same-day item with (near-)identical title. */
export function isDuplicateToday(agent, title) {
  const t = normTitle(title);
  if (!t) return false;
  return todaysItems(agent).some((e) => {
    const existing = normTitle(e.title);
    return existing === t || existing.includes(t) || t.includes(existing);
  });
}

/**
 * Producer dedup: skip a new draft when a similar-titled item already exists
 * today under a DIFFERENT id (same id = intentional idempotent refresh).
 */
export function shouldSkipDuplicate(agent, id, title) {
  if (todaysItems(agent).some((e) => e.id === id)) return false;
  return isDuplicateToday(agent, title);
}

export function decisions() {
  const a = readJson("data/approvals.json", { decisions: [] });
  const map = new Map();
  for (const d of a.decisions || []) map.set(d.id, d);
  return map;
}

export function queueItems() {
  const idx = readJson("data/queue/index.json", { items: [] });
  return idx.items
    .map((e) => ({ entry: e, item: readJson(e.path, null) }))
    .filter((x) => x.item);
}

/** Items approved by a human and not yet published. */
export function approvedUnpublished() {
  const dec = decisions();
  const pub = new Set(
    (readJson("data/published/index.json", { items: [] }).items || []).map((p) => p.id)
  );
  return queueItems().filter(
    ({ item }) => dec.get(item.id)?.status === "approved" && !pub.has(item.id)
  );
}

/** Record a publish result (publisher is the only writer here). */
export function markPublished(item, result) {
  const rec = {
    id: item.id,
    agent: item.agent,
    platform: item.platform,
    title: item.title,
    published_at: nowIso(),
    mode: result.mode, // "api" | "api-auto" | "ready-manual"
    platform_post_id: result.post_id || null, // joins organic metrics back to this creative
    result_url: result.url || null,
    detail: result.detail || null,
    payload: item.payload,
  };
  writeJson(`data/published/${item.id}.json`, rec);
  const idx = readJson("data/published/index.json", { items: [] });
  const i = idx.items.findIndex((e) => e.id === item.id);
  const entry = { id: rec.id, agent: rec.agent, platform: rec.platform, title: rec.title, published_at: rec.published_at, mode: rec.mode, platform_post_id: rec.platform_post_id, result_url: rec.result_url };
  if (i >= 0) idx.items[i] = entry;
  else idx.items.push(entry);
  writeJson("data/published/index.json", idx);
  return rec;
}
