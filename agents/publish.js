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

async function publishOne(item, { auto = false } = {}) {
  let result = null;
  if (item.platform === "tiktok") {
    const r = await tiktok.post(item.payload);
    if (r.available === false || r.skipped) {
      result = { mode: "ready-manual", detail: r.reason || "TikTok credentials not configured — post manually from the dashboard payload" };
    } else {
      result = { mode: "api", detail: `publish_id ${r.id} (SELF_ONLY until app audit passes)` };
    }
  } else if (item.platform === "instagram") {
    const r = await meta.igPublish(item.payload);
    if (r.available === false || r.skipped) {
      result = { mode: "ready-manual", detail: r.reason || "Meta credentials not configured — post manually" };
    } else {
      result = { mode: "api", detail: `ig media ${r.id}` };
    }
  } else if (item.platform === "facebook") {
    const r = await meta.pagePost(item.payload);
    result = r.available === false
      ? { mode: "ready-manual", detail: "Meta credentials not configured — post manually" }
      : { mode: "api", detail: `fb post ${r.id}` };
  } else {
    // ppc/paid campaign items and anything else are handled by ppc-push workflow / manually
    result = { mode: "ready-manual", detail: `no auto-publish path for platform "${item.platform}"` };
  }
  if (auto) result.detail = `[auto_post_organic] ${result.detail || ""}`.trim();
  markPublished(item, result);
  console.log(`[publish] ${item.id} → ${result.mode} ${result.detail || ""}${auto ? " (autonomy)" : ""}`);
  return result;
}

// ---------- path 1: human-approved items ----------
const approved = approvedUnpublished();
for (const { item } of approved) {
  try {
    await publishOne(item);
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
    const gate = canAutoPost(policy, item, counts);
    if (!gate.ok) {
      console.log(`[publish] autonomy skip ${item.id}: ${gate.reason}`);
      continue;
    }
    try {
      const result = await publishOne(item, { auto: true });
      if (result.mode === "api") {
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

if (!approved.length && !autoCount) {
  console.log("[publish] nothing published this run");
} else {
  console.log(`[publish] done · ${approved.length} approved · ${autoCount} auto-posted (mode ${policy.mode})`);
}
