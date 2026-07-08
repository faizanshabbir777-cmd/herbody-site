import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaHostAllowed, hostOf, DEFAULT_ALLOWED_HOSTS } from "../lib/media.js";

test("shopify CDN always allowed", () => {
  assert.equal(mediaHostAllowed("https://cdn.shopify.com/s/files/x.mp4", { allowlistCsv: null }).ok, true);
});

test("provider host trusted only when recorded as extraHost", () => {
  const url = "https://media.higgsfield.ai/out/x.mp4";
  assert.equal(mediaHostAllowed(url, { allowlistCsv: null }).ok, false);
  assert.equal(mediaHostAllowed(url, { allowlistCsv: null, extraHosts: ["media.higgsfield.ai"] }).ok, true);
});

test("env allowlist extends trust, subdomains included", () => {
  assert.equal(mediaHostAllowed("https://assets.example.com/x.jpg", { allowlistCsv: "example.com" }).ok, true);
  assert.equal(mediaHostAllowed("https://evil.com/x.jpg", { allowlistCsv: "example.com" }).ok, false);
});

test("non-https and junk URLs rejected", () => {
  assert.equal(mediaHostAllowed("http://cdn.shopify.com/x.mp4", { allowlistCsv: null }).ok, false);
  assert.equal(mediaHostAllowed("not a url", { allowlistCsv: null }).ok, false);
  assert.equal(mediaHostAllowed("", { allowlistCsv: null }).ok, false);
});

test("hostOf extracts hostnames safely", () => {
  assert.equal(hostOf("https://CDN.Shopify.com/x"), "cdn.shopify.com");
  assert.equal(hostOf("garbage"), null);
});

test("defaults contain only shopify CDN", () => {
  assert.deepEqual(DEFAULT_ALLOWED_HOSTS, ["cdn.shopify.com"]);
});
