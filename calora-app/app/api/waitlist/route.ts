// POST /api/waitlist
// Lightweight endpoint that validates and records the signup, but doesn't
// persist anywhere we don't already control. The deployed container runs as
// the unprivileged `nextjs` user and has no writable paths we can rely on,
// and we can't inject GitHub/Telegram tokens into the runtime without admin
// access to Dokploy's env config.
//
// What this route does:
//   1. Validates the email shape + length
//   2. Logs to the server console (visible in Dokploy logs)
//   3. Tries to also POST to a TELEGRAM_WEBHOOK_URL if env-set (operator can
//      wire it via Dokploy env later without code change)
//   4. Returns ok with a per-process monotonic counter so the UI can show
//      "you're #N" for the session. Counter resets on restart — fine for the
//      pre-launch demand signal use case, doesn't pretend to be a DB.
//
// Real persistence will land with Stripe (Phase 2). Until then this is a
// honest "we heard you" page — users see success, founder sees log lines,
// conversion signal is captured without overpromising storage durability.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-process monotonic counter. Process-scoped, fine for "you're #N today".
let _counter = 0;

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const source = (body.source || "landing")
    .slice(0, 64)
    .replace(/[^\w-]/g, "_");
  _counter += 1;

  // 1. Always log to server stdout — visible in `dokploy logs calora`.
  //    The operator can grep these and bulk-import to Mailchimp/etc. later.
  console.log(`[waitlist] #${_counter} ${email} (source=${source})`);

  // 2. Optional: forward to a Telegram bot if env-configured. Operator sets
  //    TELEGRAM_BOT_TOKEN + TELEGRAM_WAITLIST_CHAT_ID in Dokploy env. Failures
  //    here are non-fatal — the local log line is the source of truth.
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_WAITLIST_CHAT_ID;
  if (tgToken && tgChat) {
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChat,
          text: `🟢 Calora Pro waitlist\n${email}\nsource: ${source}`,
        }),
      });
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({ ok: true, position: _counter });
}

// GET — returns the in-process counter so the UI can show a social-proof chip.
// This number is per-process (resets on deploy), so the chip is best-effort —
// it'll underreport after a redeploy. That's acceptable for the MVP and avoids
// pretending we have durable storage.
export async function GET() {
  return NextResponse.json(
    { count: _counter },
    { headers: { "Cache-Control": "no-store" } },
  );
}