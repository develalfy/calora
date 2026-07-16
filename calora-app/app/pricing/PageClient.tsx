// /pricing — Public pricing page.
//
// Three-card layout: Free / Pro Monthly ($4.99) / Pro Yearly ($39.99, highlighted).
// Yearly is featured because the 33% discount is the dominant lever for conversion
// (and for annualized MRR predictability).
//
// All buttons hit /api/billing/checkout which handles "logged out → bounce to
// /sign-up?next=/pricing" + "Stripe unconfigured → render admin-config msg".
//
// Why a separate dedicated page (not /app/upgrade): the pricing page is the SEO
// landing for search terms like "ai calorie counter subscription" — App-Router
// upgrade flows are post-signup and aren't indexed.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { PRO_PRICING, type ProPlanKey } from "@/lib/billing";

type Status =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "free" }
  | { kind: "subscribed"; plan: ProPlanKey }
  | { kind: "error"; message: string };

export default function PricingPage() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [pendingPlan, setPendingPlan] = useState<ProPlanKey | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        const j = await r.json();
        if (cancelled) return;
        if (!j.user) {
          setStatus({ kind: "anon" });
          return;
        }
        const sr = await fetch("/api/billing/status", {
          credentials: "same-origin",
        });
        const s = await sr.json();
        if (cancelled) return;
        if (s.hasSubscription && (s.plan === "Pro — Monthly" || s.plan === "Pro — Yearly")) {
          setStatus({
            kind: "subscribed",
            plan: s.plan === "Pro — Monthly" ? "pro_month" : "pro_year",
          });
        } else {
          setStatus({ kind: "free" });
        }
      } catch {
        if (!cancelled) setStatus({ kind: "anon" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    track("pricing_view");
  }, []);

  async function startCheckout(plan: ProPlanKey) {
    setErrMsg(null);
    setPendingPlan(plan);

    // Not logged in? Send to sign-up first, return here after.
    if (status.kind === "anon") {
      track("upgrade_cta_click", { plan, stage: "anon" });
      window.location.href = `/sign-up?next=${encodeURIComponent("/pricing")}`;
      return;
    }

    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ plan }),
      });
      const j = await r.json();
      if (r.status === 401) {
        window.location.href = "/sign-up?next=/pricing";
        return;
      }
      if (r.status === 409 && j.code === "already_subscribed") {
        // Open the existing subscription in the portal.
        const pr = await fetch("/api/billing/portal", {
          method: "POST",
          credentials: "same-origin",
        });
        const pj = await pr.json();
        if (pj.url) {
          window.location.href = pj.url;
          return;
        }
      }
      if (r.status === 503 && j.code === "stripe_unavailable") {
        setErrMsg(
          `Payments are being set up — Stripe ${j.reason ?? "config missing"}. Try again in a few hours.`,
        );
        track("upgrade_cta_click", { plan, stage: "stripe_unavailable" });
        return;
      }
      if (!r.ok || !j.url) {
        setErrMsg(j.message ?? "Could not start checkout. Please retry.");
        track("upgrade_cta_click", { plan, stage: "checkout_failed" });
        return;
      }
      track("upgrade_cta_click", { plan, stage: "checkout_started" });
      window.location.href = j.url;
    } catch {
      setErrMsg("Network error. Please retry.");
    } finally {
      setPendingPlan(null);
    }
  }

  const cards = [
    {
      key: "free" as const,
      title: "Free",
      price: "$0",
      cadence: "forever",
      tagline: "Snap a meal. Get a number. Move on.",
      features: [
        "5 scans per day",
        "Unlimited photo + text scans",
        "Today's log + 30-day history",
        "CSV export",
      ],
      cta: status.kind === "anon" ? "Create free account" : "You're on Free",
      ctaHref: status.kind === "anon" ? "/sign-up?next=/pricing" : null,
      ctaAction: null,
      highlight: false,
    },
    {
      key: "pro_month" as const,
      title: "Pro — Monthly",
      price: formatPrice(PRO_PRICING.pro_month.cents),
      cadence: "/ month",
      tagline: PRO_PRICING.pro_month.tagline,
      features: [
        "Unlimited scans",
        "Barcode scanner",
        "Multi-day macro insights",
        "PDF nutrition reports",
        "Priority AI — M3 multimodal",
      ],
      cta:
        status.kind === "subscribed" && status.plan === "pro_month"
          ? "Current plan"
          : status.kind === "anon"
            ? "Start 7-day free trial"
            : "Start 7-day free trial",
      ctaHref: null,
      ctaAction: () => startCheckout("pro_month"),
      highlight: false,
    },
    {
      key: "pro_year" as const,
      title: "Pro — Yearly",
      price: formatPrice(PRO_PRICING.pro_year.cents),
      cadence: "/ year",
      tagline: PRO_PRICING.pro_year.tagline,
      features: [
        "Everything in Pro Monthly",
        "Save 33% vs monthly",
        "Locked-in early-bird price",
        "Billed once yearly — cancel anytime",
        "7-day free trial, no charge until day 8",
      ],
      cta:
        status.kind === "subscribed" && status.plan === "pro_year"
          ? "Current plan"
          : status.kind === "anon"
            ? "Start 7-day free trial"
            : "Start 7-day free trial",
      ctaHref: null,
      ctaAction: () => startCheckout("pro_year"),
      highlight: true,
    },
  ];

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]"
        >
          calora
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[var(--ink-soft)]">
          <Link href="/app" className="hover:text-[var(--ink)]">
            Open app
          </Link>
          <Link href="/b2b" className="hover:text-[var(--ink)]">
            For Teams
          </Link>
        </nav>
      </header>

      <section className="flex-1 px-5 py-10 max-w-5xl w-full mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="font-[family-name:var(--font-display)] text-[40px] sm:text-[48px] leading-[1.05] font-semibold tracking-tight text-[var(--ink)]">
            Pricing that scales to your habit.
          </h1>
          <p className="mt-4 text-[16px] text-[var(--ink-soft)]">
            Free is genuinely useful. Pro removes the daily cap, unlocks barcode
            scanning, and gives you PDF-ready reports. 7-day free trial, cancel
            anytime — we don&apos;t hide the unsubscribe.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {cards.map((card) => (
            <article
              key={card.key}
              className={[
                "rounded-2xl border p-6 flex flex-col",
                card.highlight
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--card)]"
                  : "border-[var(--border)] bg-[var(--card)]",
              ].join(" ")}
            >
              {card.highlight && (
                <div className="text-xs font-medium uppercase tracking-wider text-[var(--accent)] mb-2">
                  Most popular
                </div>
              )}
              <h2 className="text-[20px] font-semibold tracking-tight text-[var(--ink)]">
                {card.title}
              </h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-[36px] font-semibold tracking-tight text-[var(--ink)]">
                  {card.price}
                </span>
                <span className="text-[14px] text-[var(--ink-soft)]">
                  {card.cadence}
                </span>
              </div>
              <p className="mt-3 text-[14px] text-[var(--ink-soft)]">
                {card.tagline}
              </p>
              <ul className="mt-5 space-y-2 text-[14px] text-[var(--ink-soft)] flex-1">
                {card.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--accent)]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {card.ctaHref ? (
                <Link
                  href={card.ctaHref}
                  className="mt-6 inline-flex justify-center items-center rounded-xl px-4 py-3 text-[15px] font-medium border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--canvas)] transition"
                >
                  {card.cta}
                </Link>
              ) : (
                <button
                  onClick={card.ctaAction ?? undefined}
                  disabled={
                    !!pendingPlan ||
                    (status.kind === "subscribed" && status.plan === card.key)
                  }
                  className={[
                    "mt-6 inline-flex justify-center items-center rounded-xl px-4 py-3 text-[15px] font-medium transition disabled:opacity-50",
                    card.highlight
                      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      : "border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--canvas)]",
                  ].join(" ")}
                >
                  {pendingPlan === card.key
                    ? "Loading…"
                    : status.kind === "subscribed" && status.plan === card.key
                      ? card.cta
                      : card.cta}
                </button>
              )}
            </article>
          ))}
        </div>

        {errMsg && (
          <div className="mt-6 max-w-2xl mx-auto rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-[14px] text-amber-700 dark:text-amber-300">
            {errMsg}
          </div>
        )}

        <p className="mt-12 text-center text-[13px] text-[var(--ink-muted)]">
          7-day free trial on every Pro plan · Cancel anytime from the account
          page · No dark patterns · No phone-number-required upsells
        </p>

        <div className="mt-16 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <FAQ
            q="What happens after the trial?"
            a="We charge on day 8 unless you cancel. You can cancel with one click from /account — no email, no phone call, no retention script."
          />
          <FAQ
            q="Can I switch monthly ↔ yearly?"
            a="Yes — from /account, change plan anytime. Stripe prorates the difference."
          />
          <FAQ
            q="What if I just want to keep using Free?"
            a="Free stays free. 5 scans/day, 30-day history, CSV export. Pro adds features; it doesn't gate what you already had."
          />
          <FAQ
            q="Do you store my card?"
            a="No — Stripe does. Card data never touches our servers. We're a calorie app; we don't want that liability either."
          />
        </div>
      </section>

      <footer className="px-5 py-6 max-w-5xl w-full mx-auto text-center text-[13px] text-[var(--ink-muted)]">
        <Link href="/privacy" className="hover:text-[var(--ink)]">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="hover:text-[var(--ink)]">
          Terms
        </Link>
      </footer>
    </main>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 group">
      <summary className="text-[15px] font-medium text-[var(--ink)] cursor-pointer list-none flex items-center justify-between">
        <span>{q}</span>
        <span className="text-[var(--ink-muted)] group-open:rotate-180 transition-transform">
          ↓
        </span>
      </summary>
      <p className="mt-3 text-[14px] text-[var(--ink-soft)]">{a}</p>
    </details>
  );
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
