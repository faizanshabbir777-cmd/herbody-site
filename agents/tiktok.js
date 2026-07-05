// OmniFlash — the HerBody auto TikTok manager.
// Daily: reads strategy + memory + metrics → drafts 1–3 videos (script/hook/caption/
// hashtags/posting time) + keeps the content calendar → approval queue. Draft-first:
// nothing publishes without a human approval (see publish.js).
import { structured, untrusted } from "./lib/claude.js";
import { readJson, loadMemory, saveMemory, today } from "./lib/state.js";
import { putDraft } from "./lib/queue.js";

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
          script: { type: "string", description: "beat-by-beat, 15–35s, filmable on a phone" },
          on_screen_text: { type: "array", items: { type: "string" } },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          post_time_uk: { type: "string" },
          pillar: { type: "string" },
          filming_notes: { type: "string" },
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
const queueDepth = (readJson("data/queue/index.json", { items: [] }).items || [])
  .filter((i) => i.agent === "tiktok").length;

const user = `Date: ${today()} (idempotent daily run — if you already planned today, refresh/improve today's drafts).
Current strategy: ${JSON.stringify(strategy)}
Queue depth (tiktok): ${queueDepth}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
Produce today's TikTok drafts (1–3), a calendar note, and my updated compressed memory.`;

const { data, usage } = await structured({ charter: CHARTER, user, schema: SCHEMA });

for (const d of data.drafts) {
  putDraft("tiktok", {
    id: `${today()}-tiktok-${d.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    platform: "tiktok",
    type: "video",
    scheduled_for: today(),
    title: d.title,
    compliance_status: d.compliance_status,
    payload: d,
  });
}
saveMemory("tiktok", { ...data.memory, agent: "tiktok" });
console.log(`[omniflash] ${data.drafts.length} draft(s) queued · trend: ${data.trend_response || "—"} · tokens in/out ${usage.input_tokens}/${usage.output_tokens}`);
