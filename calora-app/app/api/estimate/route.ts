// POST /api/estimate
// Accepts image OR text, returns structured calorie/macro estimate.
//
// Provider policy (2026-07-13): only MiniMax models are permitted.
//   - minimax/minimax-m3  — multimodal (text+image+video → text), reasoning. Default.
//   - minimax/minimax-m2.7 — text-only, faster, non-multimodal. Fallback for text requests.
// Image requests fall back to M3 itself (M2.7 can't see images).
//
// Latency targets: M3 text ≈ 5-15s, M3 image ≈ 10-30s. Cloudflare free proxy times out at 100s;
// we cap server work at 90s and return 504 fast so the client can retry rather than hanging.
//
// Refactored 2026-07-15: provider-specific call logic moved to lib/ai-estimate.ts so the
// public /api/demo-estimate route can reuse the exact same AI flow without duplicating it.

import { NextRequest, NextResponse } from "next/server";
import type { EstimateRequest } from "@/lib/types";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { readSession } from "@/lib/auth";
import { recordAiCall } from "@/app/api/metrics/route";
import {
  validateImageDataUrl,
  runEstimate,
} from "@/lib/ai-estimate";

export const runtime = "nodejs";
// 90s server budget — one M3 retry (45s × 2). Cloudflare free proxy 524s at 100s so stay under.
export const maxDuration = 90;

// Per-IP rate limits. Protect the OpenRouter budget from abuse.
const FREE_TIER_RPM = 10;  // requests/min per IP — covers normal usage + retries
const FREE_TIER_RPH = 100; // requests/hour per IP — hard ceiling on scraping

// Hard body-size limit on the route — protect against absurdly large image
// payloads and accidental DoS. The Next.js client compressor caps images at
// ~500KB so 8MB gives us a 16× safety margin.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // ─── Rate limit gate ─────────────────────────────────────────────────────
  const ip = clientKey(req as unknown as { headers: Headers; ip?: string });
  const minute = rateLimit(`estimate:${ip}:m`, {
    limit: FREE_TIER_RPM,
    windowMs: 60_000,
  });
  if (!minute.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded — try again in a minute.",
        retry_after_sec: minute.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(minute.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  const hour = rateLimit(`estimate:${ip}:h`, {
    limit: FREE_TIER_RPH,
    windowMs: 3_600_000,
  });
  if (!hour.allowed) {
    return NextResponse.json(
      { error: "Hourly quota exceeded — try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(hour.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // ─── Auth gate ───────────────────────────────────────────────────────────
  // Estimate is the only route that costs us real money (M3 multimodal tokens).
  // Anon traffic is blocked before body parsing so we don't waste cycles on
  // payloads we'll never process. The client mirrors this — see app/app/page.tsx.
  const session = readSession(req.headers.get("cookie") ?? undefined);
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required to estimate calories." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Enforce hard request-size limit before parsing the body.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large (max 8MB)" },
      { status: 413 },
    );
  }

  let body: EstimateRequest;
  try {
    body = (await req.json()) as EstimateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.image && !body.text) {
    return NextResponse.json({ error: "Provide image or text" }, { status: 400 });
  }

  // Server-side image MIME validation. Defense in depth — the client also
  // compresses, but never trust the client.
  if (body.image) {
    const v = validateImageDataUrl(body.image);
    if (!v.ok) {
      return NextResponse.json(
        { error: `Invalid image: ${v.reason}` },
        { status: 400 },
      );
    }
  }

  const result = await runEstimate(body);

  if (result.ok) {
    recordAiCall({ ok: true, latencyMs: result.data._meta.latency_ms });
    return NextResponse.json(result.data);
  }

  recordAiCall({ ok: false, latencyMs: 0 });
  return NextResponse.json(
    { error: result.error, detail: result.detail },
    { status: result.status },
  );
}
