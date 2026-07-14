// GET /api/metrics — Prometheus-style scrape endpoint for Grafana Cloud / Datadog.
//
// We expose only process + business-relevant counters, not request counts (those
// belong on the reverse-proxy / Dokploy access log). Keeping the surface small
// makes alerts stable: every line here has a fixed shape.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = Date.now();
let aiCallTotal = 0;
let aiCallFailed = 0;
let aiCallSucceeded = 0;
let aiLatencyMsSum = 0;
let waitlistTotal = 0;

export function recordAiCall(opts: { ok: boolean; latencyMs: number }) {
  aiCallTotal += 1;
  if (opts.ok) aiCallSucceeded += 1;
  else aiCallFailed += 1;
  aiLatencyMsSum += opts.latencyMs;
}

export function recordWaitlistSignup() {
  waitlistTotal += 1;
}

export async function GET() {
  const uptimeSec = (Date.now() - startedAt) / 1000;
  const avgLatencyMs = aiCallTotal > 0 ? aiLatencyMsSum / aiCallTotal : 0;
  const lines = [
    "# HELP calora_uptime_seconds Process uptime in seconds",
    "# TYPE calora_uptime_seconds gauge",
    `calora_uptime_seconds ${uptimeSec.toFixed(3)}`,
    "",
    "# HELP calora_ai_calls_total Total /api/estimate calls handled",
    "# TYPE calora_ai_calls_total counter",
    `calora_ai_calls_total ${aiCallTotal}`,
    "",
    "# HELP calora_ai_calls_succeeded_total /api/estimate calls that returned a valid estimate",
    "# TYPE calora_ai_calls_succeeded_total counter",
    `calora_ai_calls_succeeded_total ${aiCallSucceeded}`,
    "",
    "# HELP calora_ai_calls_failed_total /api/estimate calls that returned an error",
    "# TYPE calora_ai_calls_failed_total counter",
    `calora_ai_calls_failed_total ${aiCallFailed}`,
    "",
    "# HELP calora_ai_latency_ms_avg Rolling average latency across all /api/estimate calls",
    "# TYPE calora_ai_latency_ms_avg gauge",
    `calora_ai_latency_ms_avg ${avgLatencyMs.toFixed(2)}`,
    "",
    "# HELP calora_waitlist_signups_total Total waitlist signups received",
    "# TYPE calora_waitlist_signups_total counter",
    `calora_waitlist_signups_total ${waitlistTotal}`,
    "",
    "# HELP calora_ai_configured Whether OPENROUTER_API_KEY is set",
    "# TYPE calora_ai_configured gauge",
    `calora_ai_configured ${process.env.OPENROUTER_API_KEY ? 1 : 0}`,
    "",
  ].join("\n");

  return new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}