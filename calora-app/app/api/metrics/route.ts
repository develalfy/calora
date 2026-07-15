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

// Per-ref signup counter for creator-attribution campaigns. We store the
// raw counter in a Map; the route layer normalizes the ref string before
// calling this (so we don't accept arbitrary attacker-controlled labels).
const signupByRef = new Map<string, number>();
export function recordSignupByRef(ref: string) {
  signupByRef.set(ref, (signupByRef.get(ref) ?? 0) + 1);
}

// B2B lead capture — mirrors waitlist pattern. Per-process counter for the
// /api/b2b/request route. Same best-effort semantics as aiCallFailed/etc.
let b2bLeadTotal = 0;
export function recordB2bLead() {
  b2bLeadTotal += 1;
}

// Public demo estimate counter — distinct from auth'd /api/estimate so we
// can see the funnel volume (anonymous traffic to /api/demo-estimate →
// future signup rate).
let demoCallTotal = 0;
let demoCallSucceeded = 0;
let demoCallFailed = 0;
let demoLatencyMsSum = 0;
export function recordDemoCall(opts: { ok: boolean; latencyMs: number }) {
  demoCallTotal += 1;
  if (opts.ok) demoCallSucceeded += 1;
  else demoCallFailed += 1;
  demoLatencyMsSum += opts.latencyMs;
}

export async function GET() {
  const uptimeSec = (Date.now() - startedAt) / 1000;
  const avgLatencyMs = aiCallTotal > 0 ? aiLatencyMsSum / aiCallTotal : 0;
  const demoAvgLatencyMs =
    demoCallTotal > 0 ? demoLatencyMsSum / demoCallTotal : 0;
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
    "# HELP calora_b2b_leads_total Total B2B demo requests received",
    "# TYPE calora_b2b_leads_total counter",
    `calora_b2b_leads_total ${b2bLeadTotal}`,
    "",
    "# HELP calora_demo_calls_total Total /api/demo-estimate calls (public, anon)",
    "# TYPE calora_demo_calls_total counter",
    `calora_demo_calls_total ${demoCallTotal}`,
    "",
    "# HELP calora_demo_calls_succeeded_total /api/demo-estimate calls that returned a valid estimate",
    "# TYPE calora_demo_calls_succeeded_total counter",
    `calora_demo_calls_succeeded_total ${demoCallSucceeded}`,
    "",
    "# HELP calora_demo_calls_failed_total /api/demo-estimate calls that returned an error",
    "# TYPE calora_demo_calls_failed_total counter",
    `calora_demo_calls_failed_total ${demoCallFailed}`,
    "",
    "# HELP calora_demo_latency_ms_avg Rolling average latency across all /api/demo-estimate calls",
    "# TYPE calora_demo_latency_ms_avg gauge",
    `calora_demo_latency_ms_avg ${demoAvgLatencyMs.toFixed(2)}`,
    "",
  ];
  // Per-ref signup lines — Prometheus cardinality discipline: cap at 100
  // distinct refs in the scrape. Beyond that, attackers could blow up the
  // metrics surface with garbage ref strings. We accept the loss because
  // the legitimate campaign footprint is small.
  const refEntries = Array.from(signupByRef.entries()).slice(0, 100);
  for (const [ref, count] of refEntries) {
    // Validated refs are already enforced by lib/attribution.ts; the labels
    // here are bounded and safe.
    const safeRef = ref.replace(/[^a-z0-9_-]/g, "_").slice(0, 64);
    lines.push(
      "# HELP calora_signups_by_ref_total Signups attributed to a creator ref code",
      "# TYPE calora_signups_by_ref_total counter",
      `calora_signups_by_ref_total{ref="${safeRef}"} ${count}`,
      "",
    );
  }
  lines.push(
    "# HELP calora_ai_configured Whether OPENROUTER_API_KEY is set",
    "# TYPE calora_ai_configured gauge",
    `calora_ai_configured ${process.env.OPENROUTER_API_KEY ? 1 : 0}`,
    "",
  );

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}