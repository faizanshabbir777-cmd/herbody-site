// Social media agent — Instagram / Facebook / Pinterest content (draft-first).
import { structured, untrusted } from "./lib/claude.js";
import { readJson, loadMemory, saveMemory, today } from "./lib/state.js";
import { putDraft } from "./lib/queue.js";

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

const user = `Date: ${today()} (idempotent daily run).
Strategy: ${JSON.stringify(strategy)}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
Produce today's social drafts (1–4 across channels) and updated compressed memory.`;

const { data, usage } = await structured({ charter: CHARTER, user, schema: SCHEMA });

for (const d of data.drafts) {
  putDraft("social", {
    id: `${today()}-social-${d.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    platform: d.channel,
    type: d.format,
    scheduled_for: today(),
    title: d.title,
    compliance_status: d.compliance_status,
    payload: d,
  });
}
saveMemory("social", { ...data.memory, agent: "social" });
console.log(`[social] ${data.drafts.length} draft(s) queued · tokens ${usage.input_tokens}/${usage.output_tokens}`);
