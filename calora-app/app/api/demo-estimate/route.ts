// POST /api/demo-estimate
//
// Public, no-auth, STRICT rate-limited AI estimate endpoint.
//
// Purpose:
//   - Powers the /try page (anon users get one estimate without signing up)
//   - Powers the /embed public widget demo (B2B prospects copy-paste it)
//   - Powers the SEO blog food-lookup widget
//
// Why no-auth works here:
//   - Each call is expensive (~$0.01-0.05 in M3 tokens), so the cost is real
//   - The strategy is to invest cheap in acquisition (no signup wall) and
//     harvest users via the memorable AI experience → CTA to /sign-up
//   - This is B2C acquisition, not a paid service. B2B is the paid API.
//
// Hard limits (stricter than the auth'd /api/estimate):
//   - 3 requests/min per IP (covers 1 normal test, blocks scripted abuse)
//   - 20 requests/hour per IP
//   - 200 requests/day per IP
//   - 8KB body-size cap (smaller than the auth'd route's 8MB)
//
// Response shape mirrors /api/estimate EXACTLY so the client code is
// shared — drop-in for any place that consumes /api/estimate.

import { NextRequest, NextResponse } from "next/server";
import type { EstimateRequest } from "@/lib/types";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { recordDemoCall } from "@/app/api/metrics/route";
import { runEstimate } from "@/lib/ai-estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 90s server budget — same as the auth'd route (single M3 call can be slow).
export const maxDuration = 90;

// Strict rate-limit policy for the public demo endpoint.
const DEMO_RPM = 3;        // per minute per IP
const DEMO_RPH = 20;       // per hour per IP
const DEMO_RPD = 200;      // per day per IP

const MAX_BODY_BYTES = 8 * 1024; // 8KB — text inputs are tiny; we don't accept photos here.

export async function POST(req: NextRequest) {
  const ip = clientKey(req as unknown as { headers: Headers; ip?: string });

  const m1 = rateLimit(`demo-estimate:${ip}:m`, {
    limit: DEMO_RPM,
    windowMs: 60_000,
  });
  if (!m1.allowed) {
    return NextResponse.json(
      {
        error: "Demo rate limit reached. Sign up free for 5 daily scans.",
        retry_after_sec: m1.retryAfterSec,
        cta: { href: "/sign-up", label: "Sign up free" },
      },
      {
        status: 429,
        headers: { "Retry-After": String(m1.retryAfterSec) },
      },
    );
  }
  const h1 = rateLimit(`demo-estimate:${ip}:h`, {
    limit: DEMO_RPH,
    windowMs: 3_600_000,
  });
  if (!h1.allowed) {
    return NextResponse.json(
      {
        error: "Demo hourly quota reached. Sign up for more.",
        retry_after_sec: h1.retryAfterSec,
        cta: { href: "/sign-up", label: "Sign up free" },
      },
      {
        status: 429,
        headers: { "Retry-After": String(h1.retryAfterSec) },
      },
    );
  }
  const d1 = rateLimit(`demo-estimate:${ip}:d`, {
    limit: DEMO_RPD,
    windowMs: 86_400_000,
  });
  if (!d1.allowed) {
    return NextResponse.json(
      {
        error: "Demo daily quota reached. Sign up for more.",
        retry_after_sec: d1.retryAfterSec,
        cta: { href: "/sign-up", label: "Sign up free" },
      },
      {
        status: 429,
        headers: { "Retry-After": String(d1.retryAfterSec) },
      },
    );
  }

  // Body size — the public demo ONLY supports text input. Image uploads would
  // need a separate authenticated/paid flow.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Demo accepts text only, max 8KB. Sign up for photo support." },
      { status: 413 },
    );
  }

  let body: EstimateRequest;
  try {
    body = (await req.json()) as EstimateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.image) {
    // Reject photos on the demo route — they're the most expensive (vision
    // tokens cost ~10× text). Send them to sign-up.
    return NextResponse.json(
      {
        error: "Photo uploads need a free account. Sign up to use camera.",
        cta: { href: "/sign-up", label: "Sign up free" },
      },
      { status: 400 },
    );
  }

  if (!body.text || body.text.trim().length < 2) {
    return NextResponse.json(
      { error: "Describe your meal (e.g. '2 eggs and toast')" },
      { status: 400 },
    );
  }
  if (body.text.length > 600) {
    return NextResponse.json(
      { error: "Description too long (max 600 chars)" },
      { status: 400 },
    );
  }

  const result = await runEstimate({ text: body.text, context: body.context });

  if (result.ok) {
    recordDemoCall({ ok: true, latencyMs: result.data._meta.latency_ms });
    return NextResponse.json(result.data);
  }

  recordDemoCall({ ok: false, latencyMs: 0 });
  return NextResponse.json(
    { error: result.error, detail: result.detail },
    { status: result.status },
  );
}

// Explicit method-not-allowed for non-POST.
export async function GET() {
  return NextResponse.json(
    { error: "POST only. Send {text: 'your meal'} as JSON." },
    { status: 405 },
  );
}
