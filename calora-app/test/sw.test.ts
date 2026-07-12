// Service-worker behavior tests run in jsdom — we test the file content
// (precache list, version bump, cache strategy) directly rather than
// dispatching real fetch events (which need a real browser).

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let swSource = "";

beforeAll(() => {
  swSource = readFileSync(
    resolve(__dirname, "../public/sw.js"),
    "utf-8",
  );
});

describe("service worker source", () => {
  it("declares cache names with a version", () => {
    expect(swSource).toMatch(/const CACHE_VERSION\s*=\s*"v\d+"/);
    expect(swSource).toContain("calora-static-");
    expect(swSource).toContain("calora-runtime-");
  });

  it("never caches /api/* routes", () => {
    expect(swSource).toMatch(/url\.pathname\.startsWith\("\/api\/"\)/);
    // Skip the rest of the if-block — don't cache API
    expect(swSource).toMatch(/url\.pathname\.startsWith\("\/api\/"\)[^}]*?return/);
  });

  it("precaches the core routes", () => {
    expect(swSource).toContain('"/"');
    expect(swSource).toContain('"/app"');
    expect(swSource).toContain('"/privacy"');
    expect(swSource).toContain('"/terms"');
    expect(swSource).toContain('"/manifest.json"');
  });

  it("handles fetch events", () => {
    expect(swSource).toContain('addEventListener("fetch"');
  });

  it("installs and activates with cleanup", () => {
    expect(swSource).toContain('addEventListener("install"');
    expect(swSource).toContain('addEventListener("activate"');
    expect(swSource).toContain("caches.delete");
  });

  it("supports skipWaiting via postMessage", () => {
    expect(swSource).toContain('SKIP_WAITING');
    expect(swSource).toContain("skipWaiting");
  });

  it("uses cache-first for static assets", () => {
    expect(swSource).toMatch(/url\.pathname\.startsWith\("\/_next\/static\/"\)/);
    expect(swSource).toMatch(/caches\.match\(req\)\.then\(\s*\(cached\)\s*=>\s*cached\s*\|\|/);
  });

  it("uses network-first for HTML pages", () => {
    expect(swSource).toContain('req.mode === "navigate"');
    // Network-first pattern: fetch then .catch() with cache.match
    expect(swSource).toMatch(/fetch\(req\)[\s\S]{1,500}caches\.match\(req\)/);
  });

  it("returns offline fallback for HTML when both fail", () => {
    expect(swSource).toMatch(/Offline/);
    expect(swSource).toContain("503");
  });

  it("declares all required event listeners", () => {
    const listeners = ["install", "activate", "fetch", "message"];
    listeners.forEach((evt) => {
      expect(swSource, `missing listener for ${evt}`).toContain(`addEventListener("${evt}"`);
    });
  });
});