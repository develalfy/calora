// Analytics — clean interface, mock implementation by default.
// To wire PostHog later, swap the `sink` in `init()`.
//
// Design principles:
// - All events go through `track()` and `identify()`. No direct third-party calls
//   scattered in component code.
// - The mock sink logs to console + localStorage so we can verify events are
//   firing in tests without a network.
// - PII (email, user_id) is intentionally NEVER passed through track(); if you
//   need to identify a user, use identify() with a stable anonymous ID.
// - No session replay or screen recording — Calora's privacy stance is "no
//   third-party advertising or behavioral tracking."

export type EventName =
  // ── Landing ────────────────────────────────────────────────────────────
  | "landing_view"
  | "landing_cta_click"
  | "pricing_view"
  // ── Onboarding ─────────────────────────────────────────────────────────
  | "onboarding_start"
  | "onboarding_step_complete"
  | "onboarding_complete"
  | "onboarding_skip"
  // ── App lifecycle ───────────────────────────────────────────────────────
  | "app_open"
  | "capture_open"
  | "scan_start"
  | "scan_complete"
  | "scan_error"
  | "scan_save"
  | "scan_edit"
  | "scan_discard"
  // ── Limits & upgrade ───────────────────────────────────────────────────
  | "free_limit_hit"
  | "upgrade_modal_view"
  | "upgrade_modal_dismiss"
  | "upgrade_cta_click"
  // ── Auth gates ─────────────────────────────────────────────────────────
  | "auth_required_capture"
  | "auth_required_estimate"
  // ── Retention ──────────────────────────────────────────────────────────
  | "history_view"
  | "csv_export"
  | "favorite_add"
  | "favorite_remove";

export interface EventPayload {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalyticsSink {
  track(event: EventName, payload?: EventPayload): void;
  identify(userId: string, traits?: EventPayload): void;
  reset(): void;
}

// ─────────────────────────────────────────────────────────────────────────
// Mock sink — console + localStorage ring buffer (last 200 events).
// Drop-in replacement: PostHog, Plausible, or Amplitude.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "calora:analytics:v1";
const MAX_EVENTS = 200;

function loadBuffer(): { name: EventName; ts: number; payload?: EventPayload; userId?: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBuffer(events: { name: EventName; ts: number; payload?: EventPayload; userId?: string }[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota errors
  }
}

let currentUserId: string | undefined;

export const mockSink: AnalyticsSink = {
  track(event, payload) {
    const entry = { name: event, ts: Date.now(), payload, userId: currentUserId };
    if (typeof console !== "undefined") {
      console.log(`[analytics] ${event}`, payload ?? "");
    }
    const buf = loadBuffer();
    buf.push(entry);
    saveBuffer(buf);
  },
  identify(userId, traits) {
    currentUserId = userId;
    if (typeof console !== "undefined") {
      console.log(`[analytics] identify ${userId}`, traits ?? "");
    }
  },
  reset() {
    currentUserId = undefined;
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  },
};

// Active sink — defaults to mock. Swap here when wiring PostHog.
let activeSink: AnalyticsSink = mockSink;

export function setSink(sink: AnalyticsSink): void {
  activeSink = sink;
}

export function track(event: EventName, payload?: EventPayload): void {
  try {
    activeSink.track(event, payload);
  } catch (e) {
    // Analytics must never break the app
    if (typeof console !== "undefined") {
      console.warn(`[analytics] track failed for ${event}:`, e);
    }
  }
}

export function identify(userId: string, traits?: EventPayload): void {
  try {
    activeSink.identify(userId, traits);
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn(`[analytics] identify failed:`, e);
    }
  }
}

export function reset(): void {
  try {
    activeSink.reset();
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Test helpers — let tests inspect what was tracked.
// ─────────────────────────────────────────────────────────────────────────

export function getRecentEvents(limit = 50): {
  name: EventName;
  ts: number;
  payload?: EventPayload;
  userId?: string;
}[] {
  const buf = loadBuffer();
  return buf.slice(-limit);
}

export function clearEvents(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}