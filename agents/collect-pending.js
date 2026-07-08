// Collect-pending — finalises creative work that outlived a previous run:
//  1. provider render jobs still marked media_status:"pending" (checkJob),
//  2. Shopify Files uploads still processing (hosted_pending:true).
// Runs at the start of each fleet run. No LLM call. Draft-first stays intact —
// finished media is stamped needs_review, never auto-passed.
import { queueItems, putDraft } from "./lib/queue.js";
import { checkJob } from "./lib/creative-gen.js";
import { rehostMedia, hostOf } from "./lib/media.js";
import { shopify } from "./lib/platforms.js";
import { loadProductSpec, approvedReferences } from "./lib/product-assets.js";
import { visionQaCheck, applyVisionVerdict } from "./lib/vision-qa.js";

const spec = loadProductSpec();
const referenceUrl = approvedReferences(spec)[0]?.url || null;

let collected = 0, stillPending = 0, failed = 0, hosted = 0;

for (const { item } of queueItems()) {
  const p = item.payload || {};
  let changed = false;

  // 1. finish provider render jobs
  if (p.media_status === "pending" && p.provider_job_id) {
    try {
      const st = await checkJob(p.provider_job_id, p.asset_type || "video");
      if (st.status === "generated" && st.media_url) {
        const hosting = await rehostMedia(st.media_url, {
          alt: `${p.brand_name || ""} ${item.title || ""}`.trim(),
          assetType: p.asset_type || "video",
        });
        const url = hosting.hosted_url || st.media_url;
        Object.assign(p, {
          media_status: "generated",
          media_url: url,
          provider_media_url: st.media_url,
          media_host: hostOf(url),
          hosted_file_id: hosting.hosted_file_id,
          hosted_pending: hosting.hosted_pending,
          hosting_note: hosting.hosting_note,
          preview_url: st.preview_url || p.preview_url || null,
          thumbnail_url: st.thumbnail_url || p.thumbnail_url || null,
          visual_qa_status: "needs_review",
        });
        if (p.asset_type === "image") p.image_url = url; else p.video_url = url;
        // Vision pre-check on the collected render (auto-fail only, never auto-pass).
        try {
          const check = await visionQaCheck({
            mediaUrl: url, thumbnailUrl: p.thumbnail_url || p.preview_url,
            assetType: p.asset_type || "video", spec, referenceUrl,
          });
          Object.assign(p, applyVisionVerdict(p, check));
        } catch { /* vision assist must never break collection */ }
        changed = true; collected++;
      } else if (st.status === "failed") {
        Object.assign(p, { media_status: "failed", visual_qa_status: "not_generated", generation_error: st.notes || "provider job failed" });
        changed = true; failed++;
      } else {
        stillPending++;
      }
    } catch (e) {
      console.log(`[collect-pending] ${item.id}: job check error ${String(e.message).slice(0, 140)} — will retry next run`);
      stillPending++;
    }
  }

  // 2. finish Shopify Files processing
  if (p.hosted_pending && p.hosted_file_id) {
    try {
      const st = await shopify.fileById(p.hosted_file_id);
      if (st.available !== false && st.ready) {
        p.media_url = st.url;
        p.media_host = hostOf(st.url);
        p.hosted_pending = false;
        p.hosting_note = "hosted on Shopify Files";
        if (p.asset_type === "image") p.image_url = st.url; else p.video_url = st.url;
        changed = true; hosted++;
      } else if (st.status === "FAILED") {
        p.hosted_pending = false;
        p.hosting_note = "Shopify processing failed — using provider URL";
        changed = true;
      }
    } catch (e) {
      console.log(`[collect-pending] ${item.id}: file check error ${String(e.message).slice(0, 140)}`);
    }
  }

  if (changed) {
    // The payload changed → the previous compliance-gate stamp is stale; drop it
    // so the next gate pass re-checks the item with its new media/fields.
    delete p.compliance_gate;
    putDraft(item.agent, { ...item, payload: p });
  }
}

console.log(`[collect-pending] ${collected} render(s) collected · ${hosted} hosting URL(s) resolved · ${failed} failed · ${stillPending} still pending`);
