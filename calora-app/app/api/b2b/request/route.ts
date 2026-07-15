// POST /api/b2b/request
//
// Lead capture for enterprise / scale-tier demos from /b2b.
// Mirrors the /api/waitlist pattern: validate, log to stdout, optional
// Telegram notify, return monotonic counter for "you're #N" social proof.
// No persistence beyond stdout + optional Telegram — JSONL-on-disk is
// blocked by Dokploy's read-only /app directory and we don't have a DB.
//
// In the B2B flow, the operator's job is to reply within 24 hours; the
// counter is encouragement for the lead (helps the form feel real).

import { NextRequest, NextResponse } from "next/server";
import { recordB2bLead } from "@/app/api/metrics/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USE_CASES = new Set([
  "fitness_app",
  "coaching",
  "wellness",
  "healthcare",
  "creator",
  "other",
]);
const VOLUMES = new Set([
  "under_1k",
  "1k_10k",
  "10k_100k",
  "over_100k",
  "unknown",
]);

// Process-scoped counter so the form can show "you're #N".
let _b2bCounter = 0;

export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    company?: string;
    use_case?: string;
    monthly_estimates?: string;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const company = (body.company || "").trim();
  const useCase = (body.use_case || "").trim();
  const monthlyEstimates = (body.monthly_estimates || "").trim();
  const message = (body.message || "").trim().slice(0, 2000);

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!company || company.length > 120) {
    return NextResponse.json(
      { error: "Company required (max 120 chars)" },
      { status: 400 },
    );
  }
  if (!USE_CASES.has(useCase)) {
    return NextResponse.json({ error: "Invalid use_case" }, { status: 400 });
  }
  if (!VOLUMES.has(monthlyEstimates)) {
    return NextResponse.json(
      { error: "Invalid monthly_estimates" },
      { status: 400 },
    );
  }

  _b2bCounter += 1;
  recordB2bLead();

  // Always log to stdout — operator can grep + import to CRM.
  console.log(
    `[b2b] #${_b2bCounter} ${email} company=${JSON.stringify(
      company,
    )} use=${useCase} vol=${monthlyEstimates} msg=${JSON.stringify(
      message.slice(0, 240),
    )}`,
  );

  // Optional Telegram notify (same env-driven pattern as /api/waitlist).
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_BOT_CHAT_ID; // optional separate chat for B2B
  if (tgToken && tgChat) {
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChat,
          text:
            `🟣 Calora B2B demo request\n` +
            `${email}\n` +
            `Company: ${company}\n` +
            `Use: ${useCase}\n` +
            `Volume: ${monthlyEstimates}\n` +
            (message ? `\n${message}` : ""),
        }),
      });
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({ ok: true, position: _b2bCounter });
}

export async function GET() {
  // Social-proof counter for the form. Best-effort, per-process.
  return NextResponse.json(
    { count: _b2bCounter },
    { headers: { "Cache-Control": "no-store" } },
  );
}
