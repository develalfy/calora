// POST /api/auth/signup — Create a new account and issue a session cookie.
//
// Failure modes:
//   400 invalid_body — missing email/password, password too short/long,
//                       email fails the shape check.
//   409 email_taken  — an account already exists with that email.
//   429 rate_limited — 5 signups/minute from the same IP.
//
// On success: 200 with `{ ok: true, user }` AND a Set-Cookie header that
// makes the user immediately logged in.

import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { signSession, buildSessionCookie } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { recordAiCall, recordSignupByRef } from "@/app/api/metrics/route";
import {
  readRefFromUrl,
  readRefFromCookieHeader,
} from "@/lib/attribution";

export const runtime = "nodejs";

const FREE_TIER_RPM = 5; // signups per minute per IP

export async function POST(req: NextRequest) {
  const ip = clientKey(req as unknown as { headers: Headers; ip?: string });
  const rl = rateLimit(`signup:${ip}:m`, { limit: FREE_TIER_RPM, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_sec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let body: { email?: unknown; password?: unknown; name?: unknown; ref?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name : null;

  // ─── Attribution ───────────────────────────────────────────────────────
  // First-touch ref capture: prefer the body's `ref` field (form submitted
  // directly with the ref in the action), then the URL `?ref=…` param (the
  // form was submitted on /sign-up?ref=…), then the cookie (the user landed
  // on / and clicked sign-up). All three go through readRefFromUrl/…
  // validation which enforces lowercase letters, digits, `-`, `_`, max 64.
  let ref: string | null = null;
  if (typeof body.ref === "string") {
    ref = readRefFromUrl(`?ref=${encodeURIComponent(body.ref)}`);
  }
  if (!ref) {
    try {
      ref = readRefFromUrl(new URL(req.url));
    } catch {
      ref = null;
    }
  }
  if (!ref) {
    ref = readRefFromCookieHeader(req.headers.get("cookie"));
  }

  const result = await createUser({
    email: body.email,
    password: body.password,
    name,
    ref,
  });

  if (!result.ok) {
    const status = result.reason === "email_taken" ? 409 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // Count this signup against the creator ref (if any) so the attribution
  // counter in /api/metrics shows campaign performance.
  if (ref) recordSignupByRef(ref);

  const token = signSession(result.user.id, result.user.email);
  recordAiCall({ ok: true, latencyMs: 0 }); // count the signup as activity

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    },
    {
      status: 200,
      headers: {
        "Set-Cookie": buildSessionCookie(token),
      },
    },
  );
}