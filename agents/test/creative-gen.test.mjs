import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { generateVideo, generateImage, isDryRun, isAvailable, providerFor } from "../lib/creative-gen.js";

beforeEach(() => {
  delete process.env.HIGGSFIELD_API_KEY;
  delete process.env.CREATIVE_GEN_DRY_RUN;
  delete process.env.VIDEO_GEN_PROVIDER;
  delete process.env.IMAGE_GEN_PROVIDER;
});

test("no API key → manual degradation, never a throw", async () => {
  const v = await generateVideo({ prompt: "jar on counter" });
  assert.equal(v.available, false);
  assert.equal(v.status, "manual");
  assert.equal(v.media_url, null);

  const i = await generateImage({ prompt: "jar on counter" });
  assert.equal(i.available, false);
  assert.equal(i.status, "manual");
});

test("dry run short-circuits before any network call", async () => {
  process.env.CREATIVE_GEN_DRY_RUN = "1";
  const v = await generateVideo({ prompt: "test video prompt", aspectRatio: "9:16" });
  assert.equal(v.available, true);
  assert.equal(v.status, "dry_run");
  assert.equal(v.media_url, null);
  assert.match(v.notes, /DRY RUN/);
  assert.ok(v.provider_job_id.startsWith("dry-"));

  const i = await generateImage({ prompt: "test image prompt" });
  assert.equal(i.status, "dry_run");
});

test("dry run works even when a key is present", async () => {
  process.env.HIGGSFIELD_API_KEY = "test-key";
  process.env.CREATIVE_GEN_DRY_RUN = "true";
  const v = await generateVideo({ prompt: "x" });
  assert.equal(v.status, "dry_run");
});

test("availability + dry-run flags read env correctly", () => {
  assert.equal(isAvailable(), false);
  assert.equal(isDryRun(), false);
  process.env.HIGGSFIELD_API_KEY = "k";
  process.env.CREATIVE_GEN_DRY_RUN = "yes";
  assert.equal(isAvailable(), true);
  assert.equal(isDryRun(), true);
});

test("provider defaults to higgsfield and honours overrides", () => {
  assert.equal(providerFor("video"), "higgsfield");
  assert.equal(providerFor("image"), "higgsfield");
  process.env.VIDEO_GEN_PROVIDER = "other-video";
  process.env.IMAGE_GEN_PROVIDER = "other-image";
  assert.equal(providerFor("video"), "other-video");
  assert.equal(providerFor("image"), "other-image");
});
