// Free-tier scan quota tracker.
// Pre-auth MVP: tracks scans per UTC day in localStorage so we can show
// "X of 5 free scans used" and gate the 6th. Post-auth: backed by the
// server-side counter on the user row.

import type { EstimateResult } from "./types";

const SCAN_KEY = "calora:scans:v1";
const DAY_MS = 86_400_000;

export interface DailyScanCount {
  date: string; // YYYY-MM-DD UTC
  count: number;
}

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function loadScans(): DailyScanCount {
  if (typeof window === "undefined") return { date: todayKey(), count: 0 };
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw) as DailyScanCount;
    // Reset counter if it's a new day
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function saveScans(d: DailyScanCount): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCAN_KEY, JSON.stringify(d));
}

/** Default free-tier limit. Can be overridden by `FREE_TIER_LIMIT` env var. */
export const DEFAULT_FREE_TIER_LIMIT = 5;

/** Returns the configured free-tier limit. */
export function freeTierLimit(): number {
  // Env var baked at build time (Next.js inlines NEXT_PUBLIC_*)
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_FREE_LIMIT) {
    const n = parseInt(process.env.NEXT_PUBLIC_FREE_LIMIT, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_FREE_TIER_LIMIT;
}

/** Returns the number of scans remaining today (≥ 0). */
export function scansRemaining(now = new Date()): number {
  const used = loadScans().count;
  return Math.max(0, freeTierLimit() - used);
}

/** Returns the number of scans used today. */
export function scansUsedToday(): number {
  return loadScans().count;
}

/** Has the user hit the free-tier limit? */
export function isOverFreeLimit(): boolean {
  return scansRemaining() <= 0;
}

/** Increment the daily scan counter. Returns the new count. */
export function recordScan(): number {
  const cur = loadScans();
  const next = { date: cur.date, count: cur.count + 1 };
  saveScans(next);
  return next.count;
}

/** Reset today's counter — useful for "reset quota" admin actions or after upgrade. */
export function resetScans(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SCAN_KEY);
}

/** Hash a string to a 6-char short id (for scan events). */
export function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

/** Estimate AI cost in USD from an OpenRouter response. Falls back to $0 if no token info. */
export function estimateAiCostUsd(
  result: EstimateResult & { _meta?: { model?: string; tokens?: { prompt?: number; completion?: number } } },
  dollarsPerMillion: { input: number; output: number } = {
    input: 0.075, // Gemini 2.5 Flash input
    output: 0.30,
  },
): number {
  const tokens = result._meta?.tokens;
  if (!tokens) return 0;
  const inCost = ((tokens.prompt ?? 0) / 1_000_000) * dollarsPerMillion.input;
  const outCost = ((tokens.completion ?? 0) / 1_000_000) * dollarsPerMillion.output;
  return inCost + outCost;
}