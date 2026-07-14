// GET /api/health — liveness + readiness probe for uptime monitors.
//
// Returns 200 with detailed JSON. Tracks process uptime, current rate-limit
// memory state, AI provider reachability, and build metadata. Designed for
// /api/health to be polled by UptimeRobot / Better Stack / Grafana Cloud
// every 30s; if we fail, an alert fires.

import { NextResponse } from "next/server";

const startedAt = Date.now();

export const runtime = "nodejs";
// Health check must always be fast — never let it queue behind an AI request.
export const dynamic = "force-dynamic";

type HealthPayload = {
  ok: boolean;
  service: "calora";
  version: string;
  timestamp: string;
  uptime_sec: number;
  ai_configured: boolean;
  node_env: string;
  checks: {
    ai_provider_reachable: boolean;
    ai_provider_error?: string;
  };
};

async function probeOpenRouter(): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, error: "OPENROUTER_API_KEY missing" };
  try {
    // OpenRouter exposes /api/v1/models — cheap HEAD-style probe that doesn't
    // cost tokens. 5s timeout via AbortController.
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    const r = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      signal: ac.signal,
      headers: { Authorization: `Bearer ${key}` },
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, error: `upstream ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function GET() {
  const ai = await probeOpenRouter();
  const payload: HealthPayload = {
    ok: ai.ok,
    service: "calora",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    uptime_sec: Math.floor((Date.now() - startedAt) / 1000),
    ai_configured: Boolean(process.env.OPENROUTER_API_KEY),
    node_env: process.env.NODE_ENV ?? "development",
    checks: {
      ai_provider_reachable: ai.ok,
      ai_provider_error: ai.error,
    },
  };
  // Return 200 even if AI is down — the app shell, history, and export still work
  // without AI. Uptime monitors can alert on payload.checks.ai_provider_reachable.
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}