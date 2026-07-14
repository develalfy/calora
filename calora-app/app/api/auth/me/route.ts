// GET /api/auth/me — Return the current session user (or null).
//
// Used by client components to check "am I logged in?" without storing
// the user in localStorage. The frontend calls this on every page load
// (and on the home page when deciding whether to show "Sign in" vs the
// account menu).
//
// 200 with `{ user: null }` if no valid session.
// 200 with `{ user: { id, email, name } }` if signed in.
//
// Note: we intentionally do NOT slide the cookie on /me polls. The
// sliding-refresh happens on real write actions (analyze, save entry)
// so a polling tab doesn't burn through sid churn.

import { NextResponse } from "next/server";
import { readSessionFromNext } from "@/lib/auth";
import { findUserById } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSessionFromNext();
  if (!session) {
    return NextResponse.json({ user: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  const user = await findUserById(session.uid);
  if (!user) {
    // Stale cookie (user deleted) — tell the client to drop it.
    return NextResponse.json({ user: null, stale: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}