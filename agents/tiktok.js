// OmniFlash — the auto TikTok manager.
// Daily: reads strategy + memory + metrics + trends → drafts 1–3 videos (script/hook/
// caption/hashtags/posting time) + requests generated video assets through the shared
// creative producer when the autonomy mode allows. Draft-first: publishing is governed
// by the approval queue + autonomy policy (see publish.js).
import { structured, untrusted } from "./lib/claude.js";
import { readJson, loadMemory, saveMemory, today } from "./lib/state.js";
import { putDraft, todaysItems, shouldSkipDuplicate } from "./lib/queue.js";
import { requestCreative } from "./lib/creative-requests.js";
import { loadAutonomy, modeAllows } from "./lib/autonomy.js";

const CHARTER = `You are OmniFlash, HerBody's TikTok manager (UK).
Your job today: plan and script TikTok content that a busy founder can film on a phone.
Content pillars: the-studied-dose education · morning ritual · ingredient facts ·
myth-busting "creatine is for gym bros" · the pledge/tokens (dignity framing) ·
first-7-days gentleness. 1–2 posts/day cadence.
Scripts are CREATOR/BRAND voice — never a fake customer testimonial, never results claims,
never before/after. Hooks must work in the first 2 seconds, spoken aloud.
Respect every compliance rule in the brand voice pack. British English.`;

const SCHEMA = {
  type: "object",
  required: ["drafts", "calendar_note", "memory"],
  properties: {
    drafts: {
      type: "array", minItems: 1, maxItems: 3,
      items: {
        type: "object",
        required: ["slug", "title", "hook", "script", "on_screen_text", "caption", "hashtags", "post_time_uk", "pillar", "compliance_status"],
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          hook: { type: "string", description: "first 2 seconds, spoken" },
          hook_variants: { type: "array", maxItems: 2, items: { type: "string" }, description: "optional alternative hooks for A/B posting (utm_content suffixes -a/-b)" },
          script: { type: "string", description: "beat-by-beat, 15–35s, filmable on a phone" },
          on_screen_text: { type: "array", items: { type: "string" } },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          post_time_uk: { type: "string" },
          pillar: { type: "string" },
          filming_notes: { type: "string" },
          generation_prompt: { type: "string", description: "cinematic 9:16 prompt for the AI video tool — must show the real product per the visual spec" },
          compliance_status: { type: "string", enum: ["PASS", "NEEDS_REVIEW"] },
          compliance_notes: { type: "string" },
        },
      },
    },
    trend_response: { type: "string", description: "if metrics/notes suggest a trend worth answering, a one-line plan; else empty" },
    calendar_note: { type: "string" },
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

const mem = loadMemory("tiktok");
const strategy = readJson("data/config/strategy.json", {});
const metrics = readJson("data/metrics/latest.json", {});
const trends = readJson("data/trends/latest.json", { relevant: [] });
const queueDepth = (readJson("data/queue/index.json", { items: [] }).items || [])
  .filter((i) => i.agent === "tiktok").length;

const user = `Date: ${today()} (idempotent daily run — if you already planned today, refresh/improve today's drafts).
Current strategy: ${JSON.stringify(strategy)}
Queue depth (tiktok): ${queueDepth}
Already queued today (do NOT duplicate these concepts): ${JSON.stringify(todaysItems("tiktok").map((e) => e.title))}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
${untrusted("trends.latest.relevant", JSON.stringify((trends.relevant || []).slice(0, 10)))}
Produce today's TikTok drafts (1–3), a calendar note, and my updated compressed memory.
Include a generation_prompt per draft so the creative producer can render the video.`;

const { data, usage } = await structured({ charter: CHARTER, user, schema: SCHEMA });

const policy = loadAutonomy();
const allowGenerate = modeAllows(policy, "generate");
let generated = 0;

let skipped = 0;
for (const d of data.drafts) {
  const id = `${today()}-tiktok-${d.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  if (shouldSkipDuplicate("tiktok", id, d.title)) {
    skipped++;
    console.log(`[omniflash] skip duplicate concept: ${d.title}`);
    continue;
  }
  // Ask the shared creative producer for the actual video asset. The producer
  // enforces the product gate (real product only) and degrades to manual when
  // generation is unavailable/disabled — the draft still queues either way.
  let creative = {
    media_status: allowGenerate ? "manual" : "generation_disabled_by_policy",
    visual_qa_status: "not_generated",
  };
  if (allowGenerate) {
    creative = await requestCreative({
      platform: "tiktok",
      format: "short-video",
      creative_goal: d.title,
      trend_basis: data.trend_response || "",
      asset_type: "video",
      prompt: d.generation_prompt || `${d.hook}\n${d.script}`,
      aspect_ratio: "9:16",
    });
    if (creative.media_status === "generated") generated++;
  }
  putDraft("tiktok", {
    id,
    platform: "tiktok",
    type: "video",
    scheduled_for: today(),
    title: d.title,
    compliance_status: d.compliance_status,
    payload: { ...d, ...creative, video_url: creative.media_url || null },
  });
}
saveMemory("tiktok", { ...data.memory, agent: "tiktok" });
console.log(`[omniflash] ${data.drafts.length - skipped} draft(s) queued (${skipped} duplicate(s) skipped) · ${generated} generated · trend: ${data.trend_response || "—"} · tokens in/out ${usage.input_tokens}/${usage.output_tokens}`);
