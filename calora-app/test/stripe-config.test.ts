// test/stripe-config.test.ts — Unit tests for lib/stripe.ts
//
// Verifies:
//   - getStripeConfig returns ready=false + reasons correctly
//   - getStripeConfig returns ready=true when all env set
//   - getStripeClient throws cleanly when STRIPE_SECRET_KEY unset
//   - requireWebhookSecret throws cleanly when STRIPE_WEBHOOK_SECRET unset
//   - URL constants are formed correctly
//
// CRITICAL: lib/stripe.ts reads env vars at MODULE LOAD time (top-level
// `const SECRET_KEY = process.env.STRIPE_SECRET_KEY`). To exercise different
// env states we must reset the module registry between tests via
// `vi.resetModules()` + dynamic import.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  // Strip Stripe env vars from the test environment by default.
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_PRO_MONTH;
  delete process.env.STRIPE_PRICE_PRO_YEAR;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.resetModules();
});

describe("lib/stripe: getStripeConfig", () => {
  it("returns ready=false when STRIPE_SECRET_KEY missing", async () => {
    const { getStripeConfig } = await import("@/lib/stripe");
    const cfg = getStripeConfig();
    expect(cfg.ready).toBe(false);
    expect(cfg.reason).toContain("STRIPE_SECRET_KEY");
  });

  it("reports price id missing when only secret is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    const { getStripeConfig } = await import("@/lib/stripe");
    const cfg = getStripeConfig();
    expect(cfg.ready).toBe(false);
    expect(cfg.reason).toContain("STRIPE_PRICE_PRO_MONTH");
  });

  it("reports year price missing when only month set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_PRICE_PRO_MONTH = "price_m";
    const { getStripeConfig } = await import("@/lib/stripe");
    const cfg = getStripeConfig();
    expect(cfg.ready).toBe(false);
    expect(cfg.reason).toContain("STRIPE_PRICE_PRO_YEAR");
  });

  it("returns ready=true when all required env vars set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_PRICE_PRO_MONTH = "price_m";
    process.env.STRIPE_PRICE_PRO_YEAR = "price_y";
    const { getStripeConfig } = await import("@/lib/stripe");
    const cfg = getStripeConfig();
    expect(cfg.ready).toBe(true);
    expect(cfg.reason).toBeUndefined();
    expect(cfg.prices.pro_month).toBe("price_m");
    expect(cfg.prices.pro_year).toBe("price_y");
  });
});

describe("lib/stripe: getStripeClient", () => {
  it("throws StripeUnavailableError when STRIPE_SECRET_KEY unset", async () => {
    const { getStripeClient, StripeUnavailableError } = await import(
      "@/lib/stripe"
    );
    expect(() => getStripeClient()).toThrow(StripeUnavailableError);
  });

  it("returns a client when STRIPE_SECRET_KEY set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    const { getStripeClient } = await import("@/lib/stripe");
    // Just check it doesn't throw — actual Stripe calls would need a mock
    // fetch and that's outside this unit's scope.
    expect(() => getStripeClient()).not.toThrow();
  });
});

describe("lib/stripe: requireWebhookSecret", () => {
  it("throws when secret missing", async () => {
    const { requireWebhookSecret, StripeUnavailableError } = await import(
      "@/lib/stripe"
    );
    expect(() => requireWebhookSecret()).toThrow(StripeUnavailableError);
  });

  it("returns the secret when set", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const { requireWebhookSecret } = await import("@/lib/stripe");
    expect(requireWebhookSecret()).toBe("whsec_test");
  });
});

describe("lib/stripe: URL constants", () => {
  it("builds a success URL containing /account", async () => {
    const { CHECKOUT_SUCCESS_URL } = await import("@/lib/stripe");
    expect(CHECKOUT_SUCCESS_URL).toContain("/account");
    expect(CHECKOUT_SUCCESS_URL).toContain("checkout=success");
  });

  it("builds a cancel URL pointing to /pricing", async () => {
    const { CHECKOUT_CANCEL_URL } = await import("@/lib/stripe");
    expect(CHECKOUT_CANCEL_URL).toContain("/pricing");
    expect(CHECKOUT_CANCEL_URL).toContain("checkout=cancelled");
  });
});
