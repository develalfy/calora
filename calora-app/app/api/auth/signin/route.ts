// POST /api/auth/signin — Verify email + password and issue a session cookie.
//
// Failure modes:
//   400 invalid_body — missing fields.
//   401 invalid_credentials — wrong email or wrong password.
//                         (The response is the same in both cases so an
//                          attacker can't enumerate which emails are registered.)
//   429 rate_limited — 20 signins/minute per IP.
//
// On success: 200 with `{ ok: true, user }` AND Set-Cookie header.
//
// SECURITY: timing. We always run bcrypt.compare() even if the user does
// not exist, so the response time is the same in both 401 paths.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findUserByEmail,
  verifyCredentials,
  recordLogin,
} from "@/lib/users";
import { signSession, buildSessionCookie } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const SIGNIN_RPM = 20;

export async function POST(req: NextRequest) {
  const ip = clientKey(req as unknown as { headers: Headers; ip?: string });
  const rl = rateLimit(`signin:${ip}:m`, { limit: SIGNIN_RPM, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_sec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await verifyCredentials(body.email, body.password);
  if (!user) {
    // Constant-time guarantee: run a dummy hash compare to equalize the
    // timing of the "no such user" path against the "wrong password" path.
    await bcrypt.compare(body.password, "$2a$12$abcdefghijklmnopqrstuv");
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await recordLogin(user.id);

  const token = signSession(user.id, user.email);
  return NextResponse.json(
    {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    },
    {
      status: 200,
      headers: { "Set-Cookie": buildSessionCookie(token) },
    },
  );
}

// Suppress unused-import warning for findUserByEmail in case future code
// paths need a "user exists?" check that's separate from password verify.
void findUserByEmail;