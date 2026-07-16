// lib/stripe.ts — Stripe SDK singleton + configuration helpers.
//
// Why a singleton: the official `stripe` package is stateless HTTP; instantiating
// per request adds garbage-collection churn for no benefit.
//
// Why env-gated: the founder hasn't pasted the Stripe keys into Dokploy yet. We
// MUST NOT 500 on import or on any Stripe call when STRIPE_SECRET_KEY is unset.
// Every public function in this file returns either a working Stripe client or
// `null`/throws a typed `StripeUnavailableError` so callers can render a clean
// "Payments are being configured" UI instead of crashing.
//
// ENV VARS REQUIRED (set in Dokploy UI, see docs/outreach/operations.md):
//   STRIPE_SECRET_KEY         sk_live_…   (or sk_test_… for staging)
//   STRIPE_PRICE_PRO_MONTH    price_…     (the $4.99/mo recurring subscription)
//   STRIPE_PRICE_PRO_YEAR     price_…     (the $39.99/yr recurring subscription)
//   STRIPE_WEBHOOK_SECRET     whsec_…     (from `stripe listen` or dashboard endpoint)
//   NEXT_PUBLIC_BASE_URL      https://calora.develalfy.me  (for success/cancel URLs)
//
// OPTIONAL:
//   STRIPE_PORTAL_RETURN_URL  https://calora.develalfy.me/account  (defaults to NEXT_PUBLIC_BASE_URL/account)

import Stripe from "stripe";

let cachedClient: Stripe | null = null;
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://calora.develalfy.me"
    : "http://localhost:3000");
export const BILLING_PORTAL_RETURN_URL =
  process.env.STRIPE_PORTAL_RETURN_URL || `${BASE_URL}/account`;
export const CHECKOUT_SUCCESS_URL = `${BASE_URL}/account?checkout=success`;
export const CHECKOUT_CANCEL_URL = `${BASE_URL}/pricing?checkout=cancelled`;

/**
 * Distinct error so callers can branch: "not configured" vs "Stripe API error".
 * Use this in webhook handlers and checkout sessions to avoid generic 500s.
 */
export class StripeUnavailableError extends Error {
  readonly status = 503;
  constructor(reason: string) {
    super(`stripe_unavailable: ${reason}`);
    this.name = "StripeUnavailableError";
  }
}

export interface StripeConfig {
  ready: boolean;
  /** Set when `!ready` — safe reason string for UI messaging. */
  reason?:
    | "STRIPE_SECRET_KEY missing"
    | "STRIPE_PRICE_PRO_MONTH missing"
    | "STRIPE_PRICE_PRO_YEAR missing";
  prices: {
    pro_month: string | null;
    pro_year: string | null;
  };
  baseUrl: string;
}

/**
 * Inspect env and report what's wired. Does NOT require a Stripe round-trip;
 * cheap to call on every checkout render.
 */
export function getStripeConfig(): StripeConfig {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_PRICE_PRO_MONTH) missing.push("STRIPE_PRICE_PRO_MONTH");
  if (!process.env.STRIPE_PRICE_PRO_YEAR) missing.push("STRIPE_PRICE_PRO_YEAR");
  return {
    ready: missing.length === 0,
    reason:
      missing.length === 0
        ? undefined
        : (`${missing[0]} missing` as StripeConfig["reason"]),
    prices: {
      pro_month: process.env.STRIPE_PRICE_PRO_MONTH ?? null,
      pro_year: process.env.STRIPE_PRICE_PRO_YEAR ?? null,
    },
    baseUrl: BASE_URL,
  };
}

/**
 * Returns a configured Stripe client, or throws StripeUnavailableError if env is unset.
 * Use this only at request time, NOT at module-load time.
 *
 * Re-reads `process.env.STRIPE_SECRET_KEY` on every call so Dokploy env rotations
 * work without a process restart, AND so tests can flip the value via
 * `process.env` between requests.
 */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) {
    throw new StripeUnavailableError("STRIPE_SECRET_KEY missing");
  }
  if (!cachedClient) {
    cachedClient = new Stripe(key, {
      // Pin API version explicitly — Stripe otherwise uses the SDK's compiled version,
      // which means a `npm update stripe` could silently change webhook semantics.
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return cachedClient;
}

/**
 * Throws StripeUnavailableError if the webhook secret is unset. Re-reads env
 * at request time so tests + Dokploy secret rotation work without re-importing.
 */
export function requireWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!s) {
    throw new StripeUnavailableError("STRIPE_WEBHOOK_SECRET missing");
  }
  return s;
}

export function getPriceId(plan: "pro_month" | "pro_year"): string | null {
  return plan === "pro_month"
    ? process.env.STRIPE_PRICE_PRO_MONTH ?? null
    : process.env.STRIPE_PRICE_PRO_YEAR ?? null;
}

export { BASE_URL };
