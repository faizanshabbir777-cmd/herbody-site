import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"));
const fleet = pkg.scripts.fleet;
const pos = (script) => {
  const i = fleet.indexOf(`node ${script}`);
  assert.ok(i >= 0, `fleet script must run ${script}`);
  return i;
};

test("fleet pipeline order invariants", () => {
  // collectors before producers
  assert.ok(pos("metrics.js") < pos("video.js"));
  assert.ok(pos("collect-pending.js") < pos("video.js"), "pending renders finalise before producers (reuse + QA)");
  assert.ok(pos("trends.js") < pos("video.js"), "producers consume today's trends");
  // OmniFlash edits AFTER the producers queue TikTok drafts
  assert.ok(pos("video.js") < pos("tiktok.js"), "editor runs after the renderer");
  assert.ok(pos("social.js") < pos("tiktok.js"));
  // compliance gate stamps after all content (incl. edited copy), before performance/paid
  assert.ok(pos("tiktok.js") < pos("compliance-gate.js"));
  assert.ok(pos("compliance-gate.js") < pos("creative-performance.js"));
  assert.ok(pos("creative-performance.js") < pos("paid-growth.js"), "paid scaling needs fresh labels");
  assert.ok(pos("paid-growth.js") < pos("tiktok-shop-ads.js"), "shop ads seed the shared budget counter from paid-growth");
  // master sees everything; notify runs last
  assert.ok(pos("tiktok-shop-ads.js") < pos("master.js"));
  assert.ok(pos("master.js") < pos("notify.js"));
  // doctor first
  assert.equal(fleet.indexOf("node doctor.js"), fleet.indexOf("node "), "doctor runs first");
});

test("publish script runs the compliance gate before publishing", () => {
  const publish = pkg.scripts.publish;
  assert.ok(publish.indexOf("compliance-gate.js") < publish.indexOf("publish.js"));
});
