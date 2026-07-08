// Publisher — the ONLY component that touches posting APIs. Two paths:
//  1. Human-approved queue items (always, any mode).
//  2. Autonomy path: in mode "auto_post_organic"+ (and kill switch OFF), organic
//     items that pass EVERY gate — compliance PASS, visual QA pass on generated
//     media, allowed platform, daily per-platform cap — publish automatically.
// No creds / no media URL → item becomes "ready-manual" with a copy-paste payload.
import { approvedUnpublished, queueItems, decisions, markPublished } from "./lib/queue.js";
import { readJson } from "./lib/state.js";
import { tiktok, meta } from "./lib/platforms.js";
import { loadAutonomy, modeAllows, canAutoPost, postedTodayByPlatform } from "./lib/autonomy.js";
import { qaDecisions, withResolvedVisualQa } from "./lib/visual-qa.js";
import { mediaHostAllowed } from "./lib/media.js";
import { approvedContradiction } from "./lib/publish-rules.js";

const qa = qaDecisions();

/** Media the posting APIs will pull must come from a trusted host. */
function mediaGate(item) {
  const url = item.payload?.video_url || item.payload?.image_url || item.payload?.media_url;
  if (!url) return { ok: true }; // no media → handlers degrade to ready-manual themselves
  return mediaHostAllowed(url, {
    // the host recorded at generation time is trusted for this item
    extraHosts: item.payload?.media_host ? [item.payload.media_host] : [],
  });
}

async function publishOne(item, { auto = false } = {}) {
  let result = null;
  const media = mediaGate(item);
  if (!media.ok) {
    // Never hand an untrusted media URL to a posting API — human posts manually.
    result = { mode: "ready-manual", detail: `media gate: ${media.reason}` };
    if (auto) {
      console.log(`[publish] autonomy left ${item.id} in queue: ${result.detail}`);
      return result;
    }
    markPublished(item, result);
    console.log(`[publish] ${item.id} → ${result.mode} ${result.detail}`);
    return result;
  }
  if (item.platform === "tiktok") {
    const r = await tiktok.post(item.payload);
    if (r.available === false || r.skipped) {
      result = { mode: "ready-manual", detail: r.reason || "TikTok credentials not configured — post manually from the dashboard payload" };
    } else {
      result = { mode: "api", post_id: r.id, detail: `publish_id ${r.id} (SELF_ONLY until app audit passes)` };
    }
  } else if (item.platform === "instagram") {
    const r = await meta.igPublish(item.payload);
    if (r.available === false || r.skipped) {
      result = { mode: "ready-manual", detail: r.reason || "Meta credentials not configured — post manually" };
    } else {
      result = { mode: "api", post_id: r.id, detail: `ig media ${r.id}` };
    }
  } else if (item.platform === "facebook") {
    const r = await meta.pagePost(item.payload);
    result = r.available === false
      ? { mode: "ready-manual", detail: "Meta credentials not configured — post manually" }
      : { mode: "api", post_id: r.id, detail: `fb post ${r.id}` };
  } else {
    // ppc/paid campaign items and anything else are handled by ppc-push workflow / manually
    result = { mode: "ready-manual", detail: `no auto-publish path for platform "${item.platform}"` };
  }
  if (auto) {
    // Autonomy must never silently consume an item it couldn't actually post:
    // ready-manual outcomes stay in the queue for a human instead of being
    // marked published. Successful API posts are labelled api-auto for audit.
    if (result.mode === "ready-manual") {
      console.log(`[publish] autonomy left ${item.id} in queue: ${result.detail}`);
      return result;
    }
    result.mode = "api-auto";
    result.detail = `[auto_post_organic] ${result.detail || ""}`.trim();
  }
  markPublished(item, result);
  console.log(`[publish] ${item.id} → ${result.mode} ${result.detail || ""}${auto ? " (autonomy)" : ""}`);
  return result;
}

// ---------- path 1: human-approved items ----------
// Contradiction rules live in lib/publish-rules.js (unit-tested): approval is
// final on judgement, but gate REJECT / failed visual QA always block.
const approved = approvedUnpublished();
let approvedPublished = 0;
for (const { item } of approved) {
  try {
    // Stamp the human QA verdict into the payload so the published record (and
    // the creative-performance loop) carries the final visual QA status.
    const resolved = withResolvedVisualQa(item, qa);
    const contradiction = approvedContradiction(resolved);
    if (contradiction) {
      console.log(`[publish] BLOCKED approved item ${item.id}: ${contradiction}`);
      continue;
    }
    await publishOne(resolved);
    approvedPublished++;
  } catch (e) {
    console.log(`[publish] ${item.id} FAILED: ${String(e.message).slice(0, 200)} — left in queue for retry`);
  }
}

// ---------- path 2: autonomy (auto_post_organic) ----------
const policy = loadAutonomy();
let autoCount = 0;
if (modeAllows(policy, "post_organic")) {
  const dec = decisions();
  const publishedIdx = readJson("data/published/index.json", { items: [] }).items || [];
  const publishedIds = new Set(publishedIdx.map((p) => p.id));
  const counts = postedTodayByPlatform(publishedIdx);
  const pending = queueItems().filter(
    ({ item }) => !dec.has(item.id) && !publishedIds.has(item.id)
  );
  for (const { item } of pending) {
    const resolved = withResolvedVisualQa(item, qa);
    const gate = canAutoPost(policy, resolved, counts);
    if (!gate.ok) {
      console.log(`[publish] autonomy skip ${item.id}: ${gate.reason}`);
      continue;
    }
    try {
      const result = await publishOne(resolved, { auto: true });
      if (result.mode === "api-auto") {
        counts[item.platform] = (counts[item.platform] || 0) + 1;
        autoCount++;
      }
    } catch (e) {
      console.log(`[publish] autonomy ${item.id} FAILED: ${String(e.message).slice(0, 200)} — left in queue`);
    }
  }
} else if (policy.kill_switch) {
  console.log("[publish] autonomy OFF — kill switch active");
}

if (!approvedPublished && !autoCount) {
  console.log("[publish] nothing published this run");
} else {
  console.log(`[publish] done · ${approvedPublished}/${approved.length} approved published · ${autoCount} auto-posted (mode ${policy.mode})`);
}
