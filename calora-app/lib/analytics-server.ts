// lib/analytics-server.ts — Server-side analytics shim.
//
// Why a separate module: the main `lib/analytics.ts` is "use client" friendly and
// uses localStorage + console. Server routes can't touch localStorage; they need
// a write that survives across requests.
//
// Today: stubbed to console.log with a tag so we can grep production logs by
// `[calora-event]`. Wire to PostHog or Datadog events API later by swapping the
// `sink` implementation — same pattern as the client-side module.

import type { EventName, EventPayload } from "./analytics";

export function trackServer(
  event: EventName,
  payload?: EventPayload,
): void {
  if (process.env.NODE_ENV === "test") return;
  // eslint-disable-next-line no-console
  console.log(
    "[calora-event]",
    JSON.stringify({ event, payload, ts: Date.now() }),
  );
}

export function identifyServer(userId: string, traits?: EventPayload): void {
  if (process.env.NODE_ENV === "test") return;
  // eslint-disable-next-line no-console
  console.log(
    "[calora-identify]",
    JSON.stringify({ userId, traits, ts: Date.now() }),
  );
}
