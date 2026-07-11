// GET /api/health
// Liveness probe used by Dokploy's healthcheck + smoke tests.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasKey = !!process.env.OPENROUTER_API_KEY;
  return NextResponse.json({
    ok: true,
    ai_configured: hasKey,
    service: "calora",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}