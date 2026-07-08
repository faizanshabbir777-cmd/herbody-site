// OmniFlash — HerBody's TikTok EDITOR and channel manager.
// The video producer (video.js) is the fleet's renderer; OmniFlash is the
// editorial layer on top: it reviews every TikTok-bound draft queued today,
// polishes hooks/captions, sets posting times, keeps the calendar, and stamps
// an editorial verdict the autonomy policy can require before auto-posting.
// Fallback: when the day's TikTok queue is EMPTY it drafts 1–2 founder-filmable
// scripts itself (no media generation — that is video.js's job).
import { structured, untrusted } from "./lib/claude.js";
import { readJson, loadMemory, saveMemory, today, nowIso } from "./lib/state.js";
import { putDraft, queueItems, todaysItems, shouldSkipDuplicate } from "./lib/queue.js";
import { lessonsForAgent } from "./lib/learning.js";

const CHARTER = `You are OmniFlash, HerBody's TikTok channel editor (UK).
You review TODAY's TikTok-bound drafts from the producer agents and make each one
channel-ready: sharpen the first-2-seconds hook (spoken aloud), tighten the caption,
pick the posting slot (07:00–08:30 ritual · 12:00–13:00 · 19:00–21:00 education),
and give a verdict:
- "approved" — ready for the founder's yes/no,
- "needs_work" — explain exactly what must change (the producer redrafts tomorrow).
Content pillars: studied-dose education · morning ritual · ingredient facts ·
myth-busting "creatine is for gym bros" · the pledge/tokens (dignity framing) ·
first-7-days gentleness. 1–2 posts/day cadence.
Everything is CREATOR/BRAND voice — never a fake customer testimonial, never results
claims, never before/after. Respect every compliance rule in the brand voice pack.
Never invent doses or prices. British English.`;

const REVIEW_SCHEMA = {
  type: "object",
  required: ["reviews", "calendar_note", "memory"],
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "verdict", "editor_notes"],
        properties: {
          id: { type: "string", description: "the queue item id being reviewed — copy it exactly" },
          verdict: { type: "string", enum: ["approved", "needs_work"] },
          improved_hook: { type: "string", description: "sharpened hook, or empty to keep the original" },
          improved_caption: { type: "string", description: "tightened caption, or empty to keep the original" },
          post_time_uk: { type: "string" },
          editor_notes: { type: "string" },
        },
      },
    },
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

const FALLBACK_SCHEMA = {
  type: "object",
  required: ["drafts", "calendar_note", "memory"],
  properties: {
    drafts: {
      type: "array", minItems: 1, maxItems: 2,
      items: {
        type: "object",
        required: ["slug", "title", "hook", "script", "on_screen_text", "caption", "hashtags", "post_time_uk", "pillar", "compliance_status"],
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          hook: { type: "string", description: "first 2 seconds, spoken" },
          hook_type: { type: "string", enum: ["question", "statement", "statistic", "pattern-interrupt", "demo"], description: "hook taxonomy (learning-loop tag)" },
          angle: { type: "string", description: "one-phrase creative angle (learning-loop tag)" },
          hook_variants: { type: "array", maxItems: 2, items: { type: "string" }, description: "optional alternative hooks for A/B posting (utm_content suffixes -a/-b)" },
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
const digest = readJson("data/state/creative-digest.json", {});
const lessons = lessonsForAgent(readJson("data/learning/lessons.json", { lessons: [] }), "tiktok");
const hints = readJson("data/learning/schedule-hints.json", {});

// TikTok-bound drafts queued today by OTHER agents, not yet reviewed.
const tiktokToday = queueItems().filter(
  ({ item }) => item.platform === "tiktok" && item.scheduled_for === today() && item.agent !== "tiktok"
);
const unreviewed = tiktokToday.filter(({ item }) => !item.payload?.editorial);

if (unreviewed.length) {
  // ---------- editorial mode ----------
  const forReview = unreviewed.slice(0, 6).map(({ item }) => ({
    id: item.id,
    agent: item.agent,
    title: item.title,
    hook: item.payload?.hook || "",
    caption: item.payload?.caption || "",
    on_screen_text: item.payload?.on_screen_text || [],
    media_status: item.payload?.media_status || "manual",
    trend_basis: item.payload?.trend_basis || "",
    compliance_status: item.compliance_status,
  }));

  const user = `Date: ${today()} — EDITORIAL PASS over today's TikTok drafts.
Strategy: ${JSON.stringify(strategy)}
Creative learnings digest: ${JSON.stringify(digest.by_agent?.tiktok || digest.summary || {})}
CONFIRMED LESSONS (hold drafts to this evidence-backed standard): ${JSON.stringify(lessons)}
Best posting slot per the learning loop: ${hints.slot || "editor's judgement"}.
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
Drafts to review (copy each id exactly):
${JSON.stringify(forReview, null, 1)}
Review every draft, give a verdict + improvements, one calendar note, and my updated compressed memory.`;

  const { data, usage } = await structured({ charter: CHARTER, user, schema: REVIEW_SCHEMA });

  let approved = 0, needsWork = 0;
  for (const r of data.reviews || []) {
    const found = unreviewed.find(({ item }) => item.id === r.id);
    if (!found) continue;
    const { item } = found;
    const p = { ...(item.payload || {}) };
    const textChanged = !!(r.improved_hook || r.improved_caption);
    if (r.improved_hook) p.hook = r.improved_hook;
    if (r.improved_caption) p.caption = r.improved_caption;
    if (r.post_time_uk) p.post_time_uk = r.post_time_uk;
    p.editorial = { verdict: r.verdict, notes: r.editor_notes, by: "omniflash", at: nowIso() };
    // Edited copy invalidates the previous mechanical compliance stamp — the
    // gate re-checks this item later in the fleet run.
    if (textChanged) delete p.compliance_gate;
    putDraft(item.agent, { ...item, payload: p });
    if (r.verdict === "approved") approved++; else needsWork++;
  }
  saveMemory("tiktok", { ...data.memory, agent: "tiktok" });
  console.log(`[omniflash] editorial pass: ${approved} approved · ${needsWork} needs-work of ${unreviewed.length} draft(s) · ${data.calendar_note ? "calendar noted" : ""} · tokens ${usage.input_tokens}/${usage.output_tokens}`);
} else if (!tiktokToday.length) {
  // ---------- fallback concept mode: keep the channel alive with founder-filmable scripts ----------
  const user = `Date: ${today()} — the TikTok queue is EMPTY today. Draft 1–2 founder-filmable scripts (no AI generation; the founder films on a phone).
Strategy: ${JSON.stringify(strategy)}
Creative learnings digest: ${JSON.stringify(digest.by_agent?.tiktok || digest.summary || {})}
CONFIRMED LESSONS (evidence-backed — follow them): ${JSON.stringify(lessons)}
Schedule hint: prefer slot ${hints.slot || "any"}, pillar ${hints.pillar || "your choice"}.
Already queued today (do NOT duplicate): ${JSON.stringify(todaysItems("tiktok").map((e) => e.title))}
My memory: ${JSON.stringify(mem)}
${untrusted("metrics.latest", JSON.stringify(metrics))}
${untrusted("trends.latest.relevant", JSON.stringify((trends.relevant || []).slice(0, 10)))}
Produce the drafts, a calendar note, and my updated compressed memory.`;

  const { data, usage } = await structured({ charter: CHARTER, user, schema: FALLBACK_SCHEMA });

  let queued = 0;
  for (const d of data.drafts) {
    const id = `${today()}-tiktok-${d.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
    if (shouldSkipDuplicate("tiktok", id, d.title)) continue;
    putDraft("tiktok", {
      id,
      platform: "tiktok",
      type: "video",
      scheduled_for: today(),
      title: d.title,
      compliance_status: d.compliance_status,
      payload: {
        ...d,
        media_status: "manual",
        visual_qa_status: "not_generated",
        editorial: { verdict: "approved", notes: "OmniFlash fallback script — founder films manually", by: "omniflash", at: nowIso() },
      },
    });
    queued++;
  }
  saveMemory("tiktok", { ...data.memory, agent: "tiktok" });
  console.log(`[omniflash] fallback: ${queued} founder-filmable script(s) queued · tokens ${usage.input_tokens}/${usage.output_tokens}`);
} else {
  console.log(`[omniflash] all ${tiktokToday.length} TikTok draft(s) already reviewed — nothing to do`);
}
