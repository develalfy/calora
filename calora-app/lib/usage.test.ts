// Unit tests for lib/usage.ts — free-tier quota tracking.
// These run in jsdom so localStorage is available.

import { describe, it, expect, beforeEach } from "vitest";
import {
  scansRemaining,
  scansUsedToday,
  isOverFreeLimit,
  recordScan,
  resetScans,
  shortHash,
  estimateAiCostUsd,
  freeTierLimit,
  DEFAULT_FREE_TIER_LIMIT,
} from "./usage";

beforeEach(() => {
  localStorage.clear();
});

describe("free tier default", () => {
  it("defaults to 5 scans per day", () => {
    expect(freeTierLimit()).toBe(DEFAULT_FREE_TIER_LIMIT);
    expect(DEFAULT_FREE_TIER_LIMIT).toBe(5);
  });
});

describe("recordScan + scansRemaining", () => {
  it("starts at full quota", () => {
    expect(scansUsedToday()).toBe(0);
    expect(scansRemaining()).toBe(5);
    expect(isOverFreeLimit()).toBe(false);
  });

  it("decrements remaining with each scan", () => {
    recordScan();
    expect(scansRemaining()).toBe(4);
    recordScan();
    expect(scansRemaining()).toBe(3);
  });

  it("clamps at 0 — never negative", () => {
    for (let i = 0; i < 10; i++) recordScan();
    expect(scansRemaining()).toBe(0);
  });

  it("flags over-limit when remaining is 0", () => {
    for (let i = 0; i < 5; i++) recordScan();
    expect(isOverFreeLimit()).toBe(true);
  });

  it("records the new count when over", () => {
    for (let i = 0; i < 6; i++) recordScan();
    expect(scansUsedToday()).toBe(6); // honest counter; UI just caps display
  });

  it("persists across reads", () => {
    recordScan();
    recordScan();
    // Re-read should see 2
    expect(scansUsedToday()).toBe(2);
  });
});

describe("resetScans", () => {
  it("clears the counter", () => {
    recordScan();
    recordScan();
    resetScans();
    expect(scansUsedToday()).toBe(0);
  });
});

describe("shortHash", () => {
  it("returns a 6-char lowercase alphanumeric", () => {
    const h = shortHash("hello world");
    expect(h).toMatch(/^[0-9a-z]{1,6}$/);
  });

  it("is deterministic for the same input", () => {
    expect(shortHash("foo")).toBe(shortHash("foo"));
  });

  it("differs for different inputs (probabilistic)", () => {
    expect(shortHash("foo")).not.toBe(shortHash("bar"));
  });

  it("handles empty string", () => {
    const h = shortHash("");
    expect(h).toBeTruthy();
  });
});

describe("estimateAiCostUsd", () => {
  it("returns 0 when no token info", () => {
    expect(estimateAiCostUsd({} as never)).toBe(0);
  });

  it("computes input + output cost", () => {
    const cost = estimateAiCostUsd({
      _meta: {
        tokens: { prompt: 1_000_000, completion: 100_000 },
      },
    } as never);
    // 1M input × $0.075 = $0.075 + 0.1M output × $0.30 = $0.03 = $0.105
    expect(cost).toBeCloseTo(0.105, 4);
  });

  it("uses custom pricing", () => {
    const cost = estimateAiCostUsd(
      { _meta: { tokens: { prompt: 1000, completion: 100 } } } as never,
      { input: 1, output: 2 },
    );
    // 1000/1M × $1 = $0.001 + 100/1M × $2 = $0.0002
    expect(cost).toBeCloseTo(0.0012, 6);
  });

  it("handles missing prompt or completion", () => {
    expect(
      estimateAiCostUsd({ _meta: { tokens: { prompt: 1_000_000 } } } as never),
    ).toBeCloseTo(0.075, 4);
    expect(
      estimateAiCostUsd({ _meta: { tokens: { completion: 1_000_000 } } } as never),
    ).toBeCloseTo(0.30, 4);
  });
});