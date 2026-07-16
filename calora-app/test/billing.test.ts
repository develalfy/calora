// test/billing.test.ts — Unit tests for lib/billing.ts
//
// Pure module — no React, no Stripe API. Covers all branch behavior of:
//   - mapToAccessTier (subscription status → access tier)
//   - planLabel (plan → human label)
//   - shapeFromStripeSubscription (Stripe payload → StoredSubscription)
//   - formatPeriodEnd (epoch ms → human date)
//   - accessTier (re-export of mapToAccessTier)

import { describe, it, expect } from "vitest";
import {
  accessTier,
  formatPeriodEnd,
  mapToAccessTier,
  planLabel,
  shapeFromStripeSubscription,
  type Plan,
  type StoredSubscription,
  type SubscriptionStatus,
} from "@/lib/billing";

const PRICE_MAP = { proMonth: "price_pro_m_test", proYear: "price_pro_y_test" };

describe("billing: mapToAccessTier", () => {
  it("treats active as full access", () => {
    expect(mapToAccessTier("active")).toBe("active");
  });

  it("treats trialing as full access (user is in trial — no need to downgrade)", () => {
    expect(mapToAccessTier("trialing")).toBe("active");
  });

  it("treats past_due as grace (give users time to fix card)", () => {
    expect(mapToAccessTier("past_due")).toBe("grace");
  });

  it("treats unpaid as grace", () => {
    expect(mapToAccessTier("unpaid")).toBe("grace");
  });

  it("treats incomplete as grace (initial card declined — second chance)", () => {
    expect(mapToAccessTier("incomplete")).toBe("grace");
  });

  it("treats canceled as inactive", () => {
    expect(mapToAccessTier("canceled")).toBe("inactive");
  });

  it("treats incomplete_expired as inactive", () => {
    expect(mapToAccessTier("incomplete_expired")).toBe("inactive");
  });
});

describe("billing: planLabel", () => {
  it("labels Free", () => {
    expect(planLabel("free")).toBe("Free");
  });
  it("labels Pro Monthly", () => {
    expect(planLabel("pro_month")).toBe("Pro — Monthly");
  });
  it("labels Pro Yearly", () => {
    expect(planLabel("pro_year")).toBe("Pro — Yearly");
  });
});

describe("billing: shapeFromStripeSubscription", () => {
  it("shapes a pro_month subscription correctly", () => {
    const r = shapeFromStripeSubscription(
      {
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        current_period_end: 1_700_000_000,
        items: {
          data: [{ price: { id: "price_pro_m_test" } }],
        },
      },
      PRICE_MAP,
    );
    expect(r).toEqual({
      status: "active",
      plan: "pro_month",
      currentPeriodEnd: 1_700_000_000 * 1000,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      startedAt: expect.any(Number) as unknown as number,
    });
  });

  it("shapes a pro_year subscription correctly", () => {
    const r = shapeFromStripeSubscription(
      {
        id: "sub_2",
        status: "trialing",
        customer: "cus_2",
        current_period_end: 1_800_000_000,
        items: {
          data: [{ price: { id: "price_pro_y_test" } }],
        },
      },
      PRICE_MAP,
    );
    expect(r?.plan).toBe("pro_year");
    expect(r?.status).toBe("trialing");
  });

  it("accepts customer as expanded Customer object", () => {
    const r = shapeFromStripeSubscription(
      {
        id: "sub_3",
        status: "active",
        customer: { id: "cus_3" },
        current_period_end: 1_700_000_000,
        items: { data: [{ price: { id: "price_pro_m_test" } }] },
      },
      PRICE_MAP,
    );
    expect(r?.stripeCustomerId).toBe("cus_3");
  });

  it("returns null when customer missing", () => {
    const r = shapeFromStripeSubscription(
      {
        id: "sub_x",
        status: "active",
        customer: "",
        items: { data: [] },
      },
      PRICE_MAP,
    );
    expect(r).toBeNull();
  });

  it("treats unrecognized price as free plan (still records subscription)", () => {
    const r = shapeFromStripeSubscription(
      {
        id: "sub_unknown",
        status: "active",
        customer: "cus_unknown",
        items: { data: [{ price: { id: "price_other" } }] },
      },
      PRICE_MAP,
    );
    expect(r?.plan).toBe("free");
    expect(r?.stripeSubscriptionId).toBe("sub_unknown");
  });

  it("tolerates missing current_period_end", () => {
    const r = shapeFromStripeSubscription(
      {
        id: "sub_4",
        status: "active",
        customer: "cus_4",
        items: { data: [{ price: { id: "price_pro_m_test" } }] },
      },
      PRICE_MAP,
    );
    expect(r?.currentPeriodEnd).toBeNull();
  });
});

describe("billing: accessTier (with null sub)", () => {
  it("returns inactive for null sub", () => {
    expect(accessTier(null)).toBe("inactive");
  });
  it("returns inactive for undefined sub", () => {
    expect(accessTier(undefined)).toBe("inactive");
  });
  it("propagates active status", () => {
    const sub: StoredSubscription = {
      status: "active",
      plan: "pro_month",
      currentPeriodEnd: null,
      stripeCustomerId: "cus",
      stripeSubscriptionId: "sub",
      startedAt: 0,
    };
    expect(accessTier(sub)).toBe("active");
  });
});

describe("billing: formatPeriodEnd", () => {
  it("returns em-dash for null", () => {
    expect(formatPeriodEnd(null)).toBe("—");
  });
  it("formats a valid timestamp", () => {
    // 1735689600000 ms = 2025-01-01 UTC
    const result = formatPeriodEnd(1735689600000);
    // Locale-dependent, so just check it includes "2025" and a month/day.
    expect(result).toMatch(/2025/);
    expect(result.length).toBeGreaterThan(5);
  });
});

describe("billing: SubscriptionStatus exhaustiveness", () => {
  it("exhaustively covers all Stripe statuses without falling through", () => {
    const allStatuses: SubscriptionStatus[] = [
      "active",
      "trialing",
      "past_due",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "unpaid",
    ];
    for (const s of allStatuses) {
      // Should never throw
      expect(mapToAccessTier(s)).toBeDefined();
    }
  });
});

describe("billing: Plan type", () => {
  it("accepts free", () => {
    const p: Plan = "free";
    expect(planLabel(p)).toBe("Free");
  });
});
