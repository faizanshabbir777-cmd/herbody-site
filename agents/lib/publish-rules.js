// Publish decision rules — pure logic extracted from publish.js so the
// approved-path safety behaviour is unit-testable.

/**
 * Human approval is the final say on copy/creative judgement, but two states
 * are contradictory with an approval and always block publishing:
 *  - mechanical compliance gate verdict REJECT (hard-banned claim present),
 *  - visual QA "fail"/"failed_auto" (the media was explicitly failed).
 * @returns string reason when blocked, else null.
 */
export function approvedContradiction(item) {
  if (item?.payload?.compliance_gate?.verdict === "REJECT") {
    return `compliance gate REJECT (${(item.payload.compliance_gate.reasons || []).join("; ").slice(0, 200)}) — fix the draft or clear the verdict before publishing`;
  }
  const qaStatus = item?.payload?.visual_qa_status;
  if (qaStatus === "fail" || qaStatus === "failed_auto") {
    return `visual QA "${qaStatus}" — media was failed; regenerate or replace it before publishing`;
  }
  return null;
}
