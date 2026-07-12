// Unit tests for lib/ratelimit.ts — sliding-window in-process limiter.
// Each test uses a unique key to avoid bucket state bleeding across tests.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, clientKey } from "./ratelimit";

let testIdx = 0;
const k = () => `ip-${++testIdx}-${Math.random().toString(36).slice(2, 6)}`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-12T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows the first hit", () => {
    const r = rateLimit(k(), { limit: 3, windowMs: 60_000 });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("counts down remaining", () => {
    const key = k();
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    const r2 = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("blocks when limit is reached", () => {
    const key = k();
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    const r4 = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSec).toBeGreaterThan(0);
  });

  it("separates buckets by key", () => {
    for (let i = 0; i < 3; i++) rateLimit(k(), { limit: 3, windowMs: 60_000 });
    const bResult = rateLimit(k(), { limit: 3, windowMs: 60_000 });
    expect(bResult.allowed).toBe(true);
  });

  it("resets after the window passes", () => {
    const key = k();
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    vi.advanceTimersByTime(61_000);
    const r = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("computes retryAfter as the time until oldest expires", () => {
    const key = k();
    rateLimit(key, { limit: 1, windowMs: 60_000 });
    vi.advanceTimersByTime(20_000);
    const r = rateLimit(key, { limit: 1, windowMs: 60_000 });
    expect(r.allowed).toBe(false);
    // 40s left in the window from the original hit
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(39);
    expect(r.retryAfterSec).toBeLessThanOrEqual(41);
  });
});

describe("clientKey", () => {
  it("prefers x-forwarded-for", () => {
    const key = clientKey({
      headers: new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }),
      ip: "9.9.9.9",
    });
    expect(key).toBe("1.2.3.4");
  });

  it("falls back to req.ip", () => {
    const key = clientKey({
      headers: new Headers({}),
      ip: "9.9.9.9",
    });
    expect(key).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no signals", () => {
    const key = clientKey({ headers: new Headers({}) });
    expect(key).toBe("unknown");
  });
});