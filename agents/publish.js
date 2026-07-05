// Publisher — the ONLY component that touches posting APIs, and only for items a
// human explicitly approved in the dashboard. Runs every 2h daytime.
// No creds / no media URL → item becomes "ready-manual" with a copy-paste payload.
import { approvedUnpublished, markPublished } from "./lib/queue.js";
import { tiktok, meta } from "./lib/platforms.js";

const items = approvedUnpublished();
if (!items.length) {
  console.log("[publish] nothing approved and unpublished — done");
  process.exit(0);
}

for (const { item } of items) {
  try {
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
      // ppc campaign items and anything else are handled by ppc-push workflow / manually
      result = { mode: "ready-manual", detail: `no auto-publish path for platform "${item.platform}"` };
    }
    markPublished(item, result);
    console.log(`[publish] ${item.id} → ${result.mode} ${result.detail || ""}`);
  } catch (e) {
    console.log(`[publish] ${item.id} FAILED: ${String(e.message).slice(0, 200)} — left in queue for retry`);
  }
}
