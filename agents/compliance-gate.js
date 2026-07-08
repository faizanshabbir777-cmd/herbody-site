// Compliance gate runner — sweeps the whole queue, stamps every item that has
// no gate verdict yet (or whose payload changed since last check is re-stamped
// on demand via --all). Verdict only — never edits creative text.
import { queueItems, putDraft } from "./lib/queue.js";
import { gateItem, applyGate } from "./lib/compliance.mjs";

const FORCE_ALL = process.argv.includes("--all");

let checked = 0, rejected = 0, review = 0, pass = 0;

for (const { item } of queueItems()) {
  if (!FORCE_ALL && item.payload?.compliance_gate) continue; // already stamped
  const result = gateItem(item);
  const stamped = applyGate(item, result);
  putDraft(item.agent, stamped);
  checked++;
  if (result.verdict === "REJECT") { rejected++; console.log(`[compliance-gate] REJECT ${item.id}: ${result.reasons.join(" · ")}`); }
  else if (result.verdict === "NEEDS_REVIEW") { review++; }
  else pass++;
}

console.log(`[compliance-gate] ${checked} item(s) checked · ${pass} pass / ${review} needs-review / ${rejected} reject`);
