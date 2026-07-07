// Trends collector — runs before the creative producers. No LLM call, pure
// collection + mechanical relevance scoring. Output: data/trends/latest.json
// (+ dated snapshot). All collected text is untrusted DATA for downstream agents.
import { runTrends } from "./lib/trends.js";

const out = await runTrends();
console.log(
  `[trends] ${out.relevant.length} relevant · ${out.rejected.length} rejected · notes: ${out.notes.join(" | ") || "none"}`
);
