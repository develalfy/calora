// Tests for lib/pending-envelope.ts — the sessionStorage envelope shared
// between CaptureView, LoadingView, and EditView. This is the regression
// test for the meal-type-silently-resets-to-Lunch bug found in QA pass
// 2 (sessionStorage race between calora:pending-estimate and
// calora:pending-result). If you change this file, also read the bug
// history in lib/pending-envelope.ts.

import { describe, it, expect, beforeEach } from "vitest";
import {
  PENDING_KEY,
  attachResult,
  buildRequest,
  clearEnvelope,
  readEnvelope,
  readRequest,
  readResult,
  seedEnvelope,
} from "@/lib/pending-envelope";
import type { EstimateResult } from "@/lib/types";

// In-memory sessionStorage stand-in. The real thing in the browser is
// per-tab, so we just need a tiny key/value store here.
let store: Record<string, string> = {};
beforeEach(() => {
  store = {};
  // sessionStorage stub — full Storage interface because TypeScript's
  // lib.dom.d.ts requires it. The helper only uses get/set/removeItem;
  // length/clear/key are here just to satisfy the type checker.
  const fakeSessionStorage: Storage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  globalThis.window = { sessionStorage: fakeSessionStorage } as unknown as Window & typeof globalThis;
  globalThis.sessionStorage = fakeSessionStorage;
});

const fakeResult: EstimateResult = {
  items: [
    { name: "oatmeal (1 cup cooked)", calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
    { name: "banana (1 medium)", calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
  ],
  totals: { calories: 255, protein_g: 6, carbs_g: 54, fat_g: 3 },
  confidence: "medium",
  notes: "test fixture",
};

describe("pending-envelope — capture → loading → edit round-trip", () => {
  it("preserves the meal-type chosen in Capture when EditView reads the envelope later", () => {
    // User taps Breakfast pill, types a description, hits Estimate.
    seedEnvelope({ text: "oatmeal with banana" }, "breakfast");

    // LoadingView mounts, fires the API call, gets a result, attaches it.
    const sent = readRequest();
    expect(sent).not.toBeNull();
    expect(sent!.meal).toBe("breakfast");
    expect(sent!.text).toBe("oatmeal with banana");
    attachResult(fakeResult);

    // EditView mounts, reads the envelope.
    const env = readEnvelope();
    expect(env.result).toEqual(fakeResult);
    expect(env.request?.meal).toBe("breakfast");

    // The exact assertion that proves the bug is fixed:
    expect(readResult()).toEqual(fakeResult);
  });

  it("survives multiple captures (second seed replaces first, attach overwrites)", () => {
    seedEnvelope({ text: "first attempt" }, "dinner");
    attachResult({ ...fakeResult, notes: "first" });

    // User goes back, picks Lunch, captures again.
    clearEnvelope();
    seedEnvelope({ text: "second attempt" }, "lunch");
    attachResult({ ...fakeResult, notes: "second" });

    const env = readEnvelope();
    expect(env.request?.meal).toBe("lunch");
    expect(env.request?.text).toBe("second attempt");
    expect(env.result?.notes).toBe("second");
    // first request's image field must NOT bleed through
    expect(env.request?.image).toBeUndefined();
  });

  it("clearEnvelope() wipes both halves of the envelope", () => {
    seedEnvelope({ text: "x" }, "snack");
    attachResult(fakeResult);
    expect(readRequest()).not.toBeNull();
    expect(readResult()).not.toBeNull();

    clearEnvelope();
    expect(readRequest()).toBeNull();
    expect(readResult()).toBeNull();
    expect(readEnvelope()).toEqual({});
  });

  it("preserves the image dataURL through the round-trip (photo path)", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    seedEnvelope({ image: dataUrl }, "breakfast");
    attachResult(fakeResult);

    const env = readEnvelope();
    expect(env.request?.image).toBe(dataUrl);
    expect(env.request?.meal).toBe("breakfast");
  });

  it("writes to the single canonical key (no more pending-estimate race)", () => {
    seedEnvelope({ text: "x" }, "lunch");
    const keys = Object.keys(store);
    expect(keys).toEqual([PENDING_KEY]);
    // The retired key MUST NOT appear.
    expect(store["calora:pending-estimate"]).toBeUndefined();
  });

  it("falls back gracefully on empty / corrupt storage", () => {
    expect(readEnvelope()).toEqual({});
    expect(readRequest()).toBeNull();
    expect(readResult()).toBeNull();

    store[PENDING_KEY] = "not-json{";
    expect(readEnvelope()).toEqual({});
    expect(readRequest()).toBeNull();
  });

  it("reads the legacy flat shape so a tab opened before this fix still works", () => {
    // Pre-fix tab wrote `{image,text,meal}` directly to
    // calora:pending-estimate. On its next request we look at the same
    // key (PENDING_KEY) — the layout merge means we should treat that
    // flat shape as a request-only envelope.
    store[PENDING_KEY] = JSON.stringify({
      image: undefined,
      text: "2 eggs",
      meal: "breakfast",
    });

    const env = readEnvelope();
    expect(env.request?.meal).toBe("breakfast");
    expect(env.request?.text).toBe("2 eggs");
    expect(readResult()).toBeNull();
  });

  it("defaults the meal to 'lunch' when the legacy shape omits it (last-resort)", () => {
    // Belt-and-braces: if someone somehow wrote a payload without a
    // meal, we don't crash — we fall back to lunch so the API call
    // still goes out.
    store[PENDING_KEY] = JSON.stringify({ text: "no meal field" });
    const req = readRequest();
    expect(req).not.toBeNull();
    expect(req!.meal).toBe("lunch");
  });
});

describe("buildRequest — pure helper", () => {
  it("echoes the meal verbatim", () => {
    const r = buildRequest({ text: "x" }, "dinner");
    expect(r.meal).toBe("dinner");
  });
  it("passes through image and text independently", () => {
    const r = buildRequest({ image: "data:...", text: "x" }, "snack");
    expect(r.image).toBe("data:...");
    expect(r.text).toBe("x");
    expect(r.meal).toBe("snack");
  });
});