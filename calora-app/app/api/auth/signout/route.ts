// POST /api/auth/signout — Clear the session cookie.
//
// Idempotent. Always returns 200 even if there was no session.

import { NextResponse } from "next/server";
import { buildClearCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": buildClearCookie() } },
  );
}