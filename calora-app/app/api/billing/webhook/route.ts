// POST /api/billing/webhook
//
// Stripe-recommended webhook handler. Receives:
//   checkout.session.completed       (subscription created; customer paid or trial started)
//   customer.subscription.created    (subscription object created)
//   customer.subscription.updated    (renewed, plan changed, payment retry)
//   customer.subscription.deleted    (canceled permanently)
//   invoice.payment_failed           (last retry failed, grace window began)
//
// SECURITY: signature is verified via `stripe.webhooks.constructEvent`. If the
// signature is invalid OR the webhook secret is unset, we return 400 — never 500.
// Never trust an unsigned payload — that would let an attacker forge "I paid" events.
//
// IDEMPOTENCY: we accept repeated deliveries. `customerId` is the source of truth:
// write to user.subscription based on the latest Stripe state, not by event sequence.

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripeClient,
  requireWebhookSecret,
  StripeUnavailableError,
  getStripeConfig,
} from "@/lib/stripe";
import { shapeFromStripeSubscription } from "@/lib/billing";
import { findUserByEmail, updateUser } from "@/lib/users";
import { trackServer } from "@/lib/analytics-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe sends the raw body. Next.js auto-parses JSON only when there's a
// Content-Type header — we read the raw text to be safe.
async function readRawBody(req: NextRequest): Promise<string> {
  return await req.text();
}

/**
 * Stripe API 2024-12 moved `current_period_end` from the Subscription root to
 * each SubscriptionItem. Older webhooks may still send it at the root level
 * (legacy), so we check both spots.
 */
function readCurrentPeriodEnd(
  sub: Stripe.Subscription | (Stripe.Response<Stripe.Subscription> & {
    current_period_end?: number;
  }),
): number | undefined {
  // Stripe.Subscription (legacy) — root field
  const root = (sub as { current_period_end?: number }).current_period_end;
  if (typeof root === "number") return root;
  // API 2024-12+ — first item
  const items = (sub as Stripe.Subscription).items?.data;
  const fromItem = items?.[0]?.current_period_end;
  if (typeof fromItem === "number") return fromItem;
  return undefined;
}

export async function POST(req: NextRequest) {
  const rawBody = await readRawBody(req);
  const signature = req.headers.get("stripe-signature");

  // Fail-closed: a missing signature on a webhook is an attack.
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const secret = requireWebhookSecret();
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    if (err instanceof StripeUnavailableError) {
      // Webhook secret unset — operationally a 503 (misconfigured), not 400.
      console.error(
        "[webhook] STRIPE_WEBHOOK_SECRET missing — refusing all events",
      );
      return NextResponse.json(
        { error: "webhook_secret_unset" },
        { status: 503 },
      );
    }
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const config = getStripeConfig();
  const priceMapping = {
    proMonth: config.prices.pro_month,
    proYear: config.prices.pro_year,
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // The checkout session carries the customer + subscription ids by id,
        // but our preference is to read the Subscription object directly when
        // we receive it; for the checkout event we just record "customer paid".
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null);
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);
        const userId = session.metadata?.userId;

        if (userId && customerId) {
          // Fetch the subscription so we have plan + period_end.
          if (subscriptionId) {
            const stripe = getStripeClient();
            const sub =
              await stripe.subscriptions.retrieve(subscriptionId);
            const shaped = shapeFromStripeSubscription(
              {
                id: sub.id,
                status: sub.status as
                  | "active"
                  | "trialing"
                  | "past_due"
                  | "canceled"
                  | "incomplete"
                  | "incomplete_expired"
                  | "unpaid",
                customer: sub.customer,
                current_period_end: readCurrentPeriodEnd(sub),
                items: {
                  data: sub.items.data.map((it) => ({
                    price: { id: it.price.id },
                  })),
                },
              },
              priceMapping,
            );
            if (shaped) {
              await updateUser(userId, { subscription: shaped });
              trackServer("upgrade_cta_click", {
                stage: "checkout_completed",
                plan: shaped.plan,
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer?.id ?? null;
        // Fallback: link via email if metadata didn't carry userId
        // (e.g. resume-after-cancel flow without metadata).
        let uid: string | undefined = userId;
        if (!uid && customerId && sub.customer && typeof sub.customer !== "string") {
          const email = (sub.customer as Stripe.Customer).email;
          if (email) {
            const u = await findUserByEmail(email);
            uid = u?.id;
          }
        }

        if (uid) {
          const shaped = shapeFromStripeSubscription(
            {
              id: sub.id,
              status: sub.status as Parameters<
                typeof shapeFromStripeSubscription
              >[0]["status"],
              customer: sub.customer,
              current_period_end: readCurrentPeriodEnd(sub),
              items: {
                data: sub.items.data.map((it) => ({
                  price: { id: it.price.id },
                })),
              },
            },
            priceMapping,
          );
          if (shaped) {
            await updateUser(uid, { subscription: shaped });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Permanent cancel. Clear the subscription; user falls back to free.
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer?.id ?? null;
        const userId = sub.metadata?.userId;
        let uid: string | undefined = userId;
        if (!uid && customerId) {
          // We don't know which user is which from customerId alone — scan via email.
          const stripe = getStripeClient();
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted && customer.email) {
            const u = await findUserByEmail(customer.email);
            uid = u?.id;
          }
        }
        if (uid) {
          await updateUser(uid, {
            subscription: {
              status: "canceled",
              plan: "free",
              currentPeriodEnd: null,
              stripeCustomerId:
                typeof sub.customer === "string"
                  ? sub.customer
                  : sub.customer?.id ?? null,
              stripeSubscriptionId: sub.id,
              startedAt: Date.now(),
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        // Stripe already updates the subscription to "past_due"; the
        // subscription.updated event will fire and write that status.
        // We log here for ops visibility only.
        trackServer("upgrade_modal_view", {
          stage: "invoice_payment_failed",
        });
        break;
      }

      default:
        // Acknowledge silently — Stripe expects 2xx for unhandled event types.
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error", event.type, err);
    // Return 500 so Stripe retries — partial side effects may have happened
    // and we want to be sure the row got updated.
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
