// GET /api/billing/status
//
// Returns the current user's subscription record + their access tier.
// Used by /pricing, /account, and the Upgrade CTA in /app.
//
// Auth required. Returns 401 for anon.

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import {
  accessTier,
  formatPeriodEnd,
  mapToAccessTier,
  planLabel,
  type StoredSubscription,
} from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BillingStatus {
  hasSubscription: boolean;
  plan: string;
  status: StoredSubscription["status"] | "free";
  accessTier: ReturnType<typeof accessTier>;
  currentPeriodEnd: string | null;
  /** True if Stripe env is configured on the server. Lets client render fallback UI. */
  stripeReady: boolean;
}

export async function GET(req: NextRequest) {
  const session = readSession(req.headers.get("cookie") ?? undefined);
  if (!session?.uid) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const user = await findUserById(session.uid);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  const sub = user.subscription ?? null;
  const tier = accessTier(sub);

  return NextResponse.json<BillingStatus>({
    hasSubscription: !!sub,
    plan: planLabel(sub?.plan ?? "free"),
    status: sub?.status ?? "free",
    accessTier: tier,
    currentPeriodEnd: formatPeriodEnd(sub?.currentPeriodEnd ?? null),
    stripeReady: !!process.env.STRIPE_SECRET_KEY,
  });
}

// Keep mapToAccessTier imported so eslint doesn't flag unused; re-exported for
// future tightening of exposed tier semantics.
export { mapToAccessTier };
