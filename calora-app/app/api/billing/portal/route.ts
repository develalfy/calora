// POST /api/billing/portal
//
// Generates a Stripe Customer Portal URL for the authed user.
// Customer Portal lets users: update card, cancel, view invoices, switch plan.
// Stripe-hosted, PCI-scoped to Stripe — we never touch the card ourselves.
//
// Auth required. If user has no stripeCustomerId yet (never subscribed),
// we return 400 with a code so the client can route them to checkout instead.

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import {
  BILLING_PORTAL_RETURN_URL,
  getStripeClient,
  getStripeConfig,
  StripeUnavailableError,
} from "@/lib/stripe";
import { trackServer } from "@/lib/analytics-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = readSession(req.headers.get("cookie") ?? undefined);
  if (!session?.uid) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const config = getStripeConfig();
  if (!config.ready) {
    return NextResponse.json(
      { code: "stripe_unavailable", reason: config.reason },
      { status: 503 },
    );
  }

  const user = await findUserById(session.uid);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  const customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { code: "no_subscription", message: "User has no Stripe customer id yet" },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeClient();
    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: BILLING_PORTAL_RETURN_URL,
      });
    trackServer("upgrade_modal_view", { stage: "portal_opened" });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    if (err instanceof StripeUnavailableError) {
      return NextResponse.json(
        { code: "stripe_unavailable", reason: err.message },
        { status: 503 },
      );
    }
    console.error("[/api/billing/portal] error", err);
    return NextResponse.json(
      { code: "portal_failed" },
      { status: 502 },
    );
  }
}
