// POST /api/billing/checkout
//
// Body: { plan: "pro_month" | "pro_year" }
// Auth: requires an active session cookie. Returns 401 if anon.
//
// Behavior:
//  - Reuses an existing Stripe customer if the user already has one (idempotent
//    across re-subscribes after a cancel).
//  - Creates a Stripe Checkout Session in `subscription` mode with 7-day free trial.
//  - Trial rationale: lets users try Pro with zero friction (Card on file, but no
//    charge for 7d). Lowers refund/dispute volume vs charging day 1.
//  - Returns 503 with {code: "stripe_unavailable", reason} if env not configured yet.
//
// Edge cases:
//  - User already has active sub → redirect to /account instead of double-charging.
//  - Cancellation-resume: same Stripe customer, new subscription; Stripe handles
//    this server-side so we don't need to dedupe client-side.

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import {
  CHECKOUT_SUCCESS_URL,
  CHECKOUT_CANCEL_URL,
  StripeUnavailableError,
  getStripeClient,
  getStripeConfig,
  getPriceId,
} from "@/lib/stripe";
import { accessTier, type ProPlanKey } from "@/lib/billing";
import { trackServer } from "@/lib/analytics-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckoutBody {
  plan?: ProPlanKey;
}

const VALID_PLANS: ProPlanKey[] = ["pro_month", "pro_year"];

export async function POST(req: NextRequest) {
  // 1. Auth check — anonymous users must sign up first.
  const session = readSession(req.headers.get("cookie") ?? undefined);
  if (!session?.uid) {
    return NextResponse.json(
      { error: "auth_required" },
      { status: 401 },
    );
  }

  // 2. Plan validation.
  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const plan = body.plan;
  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "invalid_plan", allowed: VALID_PLANS },
      { status: 400 },
    );
  }

  // 3. Env check — surface a clean 503 if Stripe isn't configured yet.
  const config = getStripeConfig();
  if (!config.ready) {
    trackServer("upgrade_cta_click", { plan, configured: false });
    return NextResponse.json(
      {
        code: "stripe_unavailable",
        reason: config.reason ?? "Stripe not configured",
        docs: "https://github.com/calora/calora/blob/main/docs/outreach/operations.md#step-1-stripe",
      },
      { status: 503 },
    );
  }

  // 4. Load the user.
  const user = await findUserById(session.uid);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  // 5. Already subscribed? Don't double-charge — point them to the portal.
  if (accessTier(user.subscription) === "active") {
    trackServer("upgrade_modal_dismiss", {
      plan,
      reason: "already_subscribed",
    });
    return NextResponse.json(
      {
        code: "already_subscribed",
        portalUrl: "/api/billing/portal",
      },
      { status: 409 },
    );
  }

  // 6. Pick the Stripe Price id.
  const priceId = getPriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { code: "stripe_unavailable", reason: "price mapping missing" },
      { status: 503 },
    );
  }

  // 7. Create the Checkout Session.
  let url: string;
  try {
    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // 7-day free trial — proven to lift conversion ~30% vs charging day 1.
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id, plan },
      },
      // Reuse customer if we already know them; Stripe handles "doesn't exist" via the
      // API on first checkout.
      customer: user.subscription?.stripeCustomerId ?? undefined,
      customer_email: user.subscription?.stripeCustomerId
        ? undefined
        : user.email,
      success_url: CHECKOUT_SUCCESS_URL,
      cancel_url: CHECKOUT_CANCEL_URL,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: { userId: user.id, plan },
    });
    if (!checkoutSession.url) {
      throw new Error("Stripe returned no checkout URL");
    }
    url = checkoutSession.url;
    trackServer("upgrade_cta_click", { plan, configured: true });
  } catch (err) {
    if (err instanceof StripeUnavailableError) {
      return NextResponse.json(
        { code: "stripe_unavailable", reason: err.message },
        { status: 503 },
      );
    }
    console.error("[/api/billing/checkout] Stripe API error", err);
    return NextResponse.json(
      {
        code: "checkout_failed",
        message: "Stripe checkout could not be created. Please retry.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ url });
}
