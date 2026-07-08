// Social media agent — Instagram / Facebook / Pinterest content (draft-first).
// Requests generated image or video assets through the shared creative producer
// (real product only, per the product gate) when the autonomy mode allows.
import { structured, untrusted } from "./lib/claude.js";
import { readJson, loadMemory, saveMemory, today } from "./lib/state.js";
import { putDraft, todaysItems, shouldSkipDuplicate } from "./lib/queue.js";
import { requestCreative, reusableCreative } from "./lib/creative-requests.js";
import { loadAutonomy, modeAllows } from "./lib/autonomy.js";

/** Formats that need motion assets; everything else gets a still image. */
const VIDEO_FORMATS = new Set(["reel"]);

const CHARTER = `You are HerBody's social media manager (UK) for Instagram, Facebook and Pinterest.
Plan today's posts: IG feed/reel/story concepts, FB page post, occasional Pinterest pin.
Visual direction: cream/oat grounds, black label-blocks, pink #ED2078 accents, real-women
morning-light imagery (describe the shot — no image generation here). Every post needs a
described visual the founder can shoot or assemble from the brand kit.
Never fabricate testimonials or results. Respect all brand-voice compliance rules. British English.`;

const SCHEMA = {
  type: "object",
  required: ["drafts", "memory"],
  properties: {
    drafts: {
      type: "array", minItems: 1, maxItems: 4,
      items: {
        type: "object",
        required: ["slug", "title", "channel", "format", "caption", "visual_brief", "compliance_status"],
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          channel: { type: "string", enum: ["instagram", "facebook", "pinterest"] },
          format: { type: "string", enum: ["feed", "reel", "story", "carousel", "pin", "page_post"] },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          visual_brief: { type: "string" },
          generation_prompt: { type: "string", description: "prompt for the AI image/video tool — must show the real product per the visual spec" },
          alt_text: { type: "string" },
          link: { type: "string" },
          post_time_uk: { type: "string" },
          compliance_status: { type: "string", enum: ["PASS", "NEEDS_REVIEW"] },
          compliance_notes: { type: "string" },
        },
      },
    },
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

const mem = loadMemory("social");
const strategy = readJson("data/config/strategy.json", {});
const metrics = readJson("data/metrics/latest.json", {});
const digest = readJson("data/state/creative-digest.json", {});

const user = `Date: ${today()} (idempotent daily run).
Strategy: ${JSON.stringify(strategy)}
Creative learnings digest (make more of the winners, retire the fatigued angles): ${JSON.stringify(digest.by_agent?.social || {})}
Already queued today (do NOT duplicate these concepts): ${JSON.stringify(todaysItems("social").map((e) => e.title))}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
Produce today's social drafts (1–4 across channels) and updated compressed memory.`;

const { data, usage } = await structured({ charter: CHARTER, user, schema: SCHEMA });

const policy = loadAutonomy();
const allowGenerate = modeAllows(policy, "generate");
let generated = 0;

let skipped = 0;
for (const d of data.drafts) {
  const id = `${today()}-social-${d.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  if (shouldSkipDuplicate("social", id, d.title)) {
    skipped++;
    console.log(`[social] skip duplicate concept: ${d.title}`);
    continue;
  }
  const assetType = VIDEO_FORMATS.has(d.format) ? "video" : "image";
  const existing = readJson(`data/queue/social/${id}.json`, null);
  let creative = reusableCreative(existing?.payload);
  if (!creative) {
    creative = {
      media_status: allowGenerate ? "manual" : "generation_disabled_by_policy",
      visual_qa_status: "not_generated",
    };
    if (allowGenerate) {
      creative = await requestCreative({
        platform: d.channel,
        format: d.format,
        creative_goal: d.title,
        asset_type: assetType,
        prompt: d.generation_prompt || d.visual_brief,
        aspect_ratio: assetType === "video" || d.format === "story" ? "9:16" : "1:1",
      });
      if (creative.media_status === "generated") generated++;
    }
  }
  putDraft("social", {
    id,
    platform: d.channel,
    type: d.format,
    scheduled_for: today(),
    title: d.title,
    compliance_status: d.compliance_status,
    payload: {
      ...d,
      ...creative,
      // publisher contract: IG needs image_url or video_url to API-post
      image_url: assetType === "image" ? creative.media_url || null : null,
      video_url: assetType === "video" ? creative.media_url || null : null,
    },
  });
}
saveMemory("social", { ...data.memory, agent: "social" });
console.log(`[social] ${data.drafts.length - skipped} draft(s) queued (${skipped} duplicate(s) skipped) · ${generated} generated · tokens ${usage.input_tokens}/${usage.output_tokens}`);
