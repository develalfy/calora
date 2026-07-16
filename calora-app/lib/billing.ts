// lib/billing.ts — Subscription plans, status mapping, and gating helpers.
//
// Pure module — no React, no Stripe API calls. Unit-tested without network.
//
// Why custom helpers around Stripe's webhook payloads: Stripe's events evolve
// (apiVersion) and we want one place to convert them to a stable internal
// "subscription state" that the rest of the app reads.

export type Plan = "free" | "pro_month" | "pro_year";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

/** Internal shape persisted on the User row. */
export interface StoredSubscription {
  status: SubscriptionStatus;
  plan: Plan;
  /** Unix ms when current period ends (or has ended on canceled). */
  currentPeriodEnd: number | null;
  /** Stripe customer id — for portal link & cross-window cancellation. */
  stripeCustomerId: string | null;
  /** Stripe subscription id — used for idempotent webhook handling. */
  stripeSubscriptionId: string | null;
  /** When the subscription was first activated. */
  startedAt: number;
}

/**
 * Map a Stripe subscription status to one of our three semantic tiers:
 *   "active"    → user has paid, full feature access.
 *   "grace"     → past_due / unpaid / incomplete — they HAD access, give them 3 days
 *                 to fix payment before downgrading.
 *   "inactive"  → everything else (canceled, incomplete_expired, never had a sub).
 *
 * The grace tier is the difference between a friendly UX and angry support tickets.
 */
export type AccessTier = "active" | "grace" | "inactive";

export function mapToAccessTier(status: SubscriptionStatus): AccessTier {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "grace";
    case "canceled":
    case "incomplete_expired":
      return "inactive";
    default: {
      // Exhaustiveness check — if Stripe adds a new status, TS will yell here.
      const _exhaust: never = status;
      return "inactive";
    }
  }
}

/** Human label for the account page + pricing comparison. */
export function planLabel(plan: Plan): string {
  switch (plan) {
    case "free":
      return "Free";
    case "pro_month":
      return "Pro — Monthly";
    case "pro_year":
      return "Pro — Yearly";
    default: {
      const _exhaust: never = plan;
      return "Free";
    }
  }
}

/** Price in cents — what users see on /pricing. */
export const PRO_PRICING = {
  pro_month: {
    cents: 499,
    currency: "USD" as const,
    cadence: "month" as const,
    /** Effective 33% discount, called out prominently — converts at the right point. */
    tagline: "$4.99 / month, cancel anytime",
    highlight: false as const,
  },
  pro_year: {
    cents: 3999,
    currency: "USD" as const,
    cadence: "year" as const,
    tagline: "$39.99 / year · save 33% vs monthly",
    highlight: true as const,
  },
} as const;

export type ProPlanKey = keyof typeof PRO_PRICING;

/**
 * From Stripe webhook, convert a Subscription object into our StoredSubscription.
 * Only include plan if the line item matches one of our known prices; otherwise
 * we treat the sub as "unknown" — still store stripeSubscriptionId for traceability.
 */
export function shapeFromStripeSubscription(
  sub: {
    id: string;
    status: SubscriptionStatus;
    customer: string | unknown;
    current_period_end?: number;
    items?: { data: Array<{ price?: { id?: string | null } }> };
  },
  priceMapping: { proMonth: string | null; proYear: string | null },
  now = Date.now(),
): StoredSubscription | null {
  // Stripe SDK can hand us customer as either a string id or an expanded object.
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as { id?: string } | null)?.id ?? null;

  if (!customerId) return null;

  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  let plan: Plan = "free";
  if (priceId && priceId === priceMapping.proMonth) plan = "pro_month";
  else if (priceId && priceId === priceMapping.proYear) plan = "pro_year";

  return {
    status: sub.status,
    plan,
    currentPeriodEnd:
      typeof sub.current_period_end === "number"
        ? sub.current_period_end * 1000
        : null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    startedAt: now,
  };
}

/**
 * Decide whether a user has access to Pro-only features right now.
 *
 * Inputs: their stored subscription record (may be undefined for free users)
 *         OR a recently-updated one being compared.
 *
 * Returns: "active" (full access), "grace" (downgraded in 3 days unless payment
 *          fixes), or "inactive" (no access).
 *
 * Used by:
 *  - app/app/page.tsx — to gate advanced scans/exports for free users.
 *  - app/account/page.tsx — to render correct badge.
 */
export function accessTier(sub: StoredSubscription | null | undefined): AccessTier {
  if (!sub) return "inactive";
  return mapToAccessTier(sub.status);
}

/**
 * Helper: format a stored CurrentPeriodEnd timestamp as "renews on Mar 14, 2026".
 */
export function formatPeriodEnd(epochMs: number | null): string {
  if (!epochMs) return "—";
  const d = new Date(epochMs);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
