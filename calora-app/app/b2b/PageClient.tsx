// /b2b — Calora for Teams & Integrations
//
// One-page pitch for B2B prospects: companies that want calorie tracking
// embedded in their product (corporate wellness, fitness apps, coaching
// platforms, hospital nutrition programs).
//
// Why this page is the fast path to $1k MRR:
//   - 1 B2B client × 5k estimates/mo @ $0.10/estimate = $500/mo
//   - 2 clients = $1k/mo — no consumer conversion needed
//   - B2B needs ZERO auth friction to evaluate: this page + a /try or /embed
//     demo is enough to start a conversation
//
// Conversion events tracked:
//   - b2b_view  (page load)
//   - b2b_demo_request  (form submitted)
//   - b2b_cta_click  (mailto or demo link)

"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import {
  IconCheck,
  IconChevronRight,
  IconLeaf,
  IconSparkle,
} from "@/components/Icons";

export default function B2BPage() {
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "err">(
    "idle",
  );
  const [position, setPosition] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      company: (form.elements.namedItem("company") as HTMLInputElement).value.trim(),
      use_case:
        (form.elements.namedItem("use_case") as HTMLSelectElement).value || "other",
      monthly_estimates:
        (form.elements.namedItem("monthly_estimates") as HTMLSelectElement).value ||
        "unknown",
      message:
        (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim() ||
        undefined,
    };
    setState("submitting");
    try {
      const res = await fetch("/api/b2b/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("non-2xx");
      const json = (await res.json()) as { ok: boolean; position: number };
      setPosition(json.position);
      setState("ok");
      track("b2b_demo_request", {
        use_case: data.use_case,
        monthly_estimates: data.monthly_estimates,
      });
    } catch {
      setState("err");
      track("b2b_demo_request_failed", {});
    }
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      {/* ─── Nav (matches / for brand consistency) ─── */}
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]"
        >
          calora <span className="text-[var(--accent)]">/</span> teams
        </Link>
        <nav className="flex items-center gap-1">
          <a
            href="#demo"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Try the embed
          </a>
          <a
            href="#pricing"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Pricing
          </a>
          <a
            href="#demo-form"
            className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
          >
            Book a demo
          </a>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="px-5 pt-12 pb-16 max-w-3xl w-full mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-soft)] text-[12px] font-medium text-[var(--ink-soft)] mb-6">
          <IconSparkle size={14} />
          <span>Embeddable AI calorie tracking · REST API · White-label</span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-[40px] sm:text-[52px] leading-[1.05] font-semibold tracking-[-0.025em] text-[var(--ink)]">
          Your users want calorie tracking.
          <br />
          <span className="text-[var(--accent)]">We already built it.</span>
        </h1>

        <p className="mt-5 text-[17px] leading-relaxed text-[var(--ink-soft)] max-w-xl mx-auto">
          Calora&apos;s AI reads a meal photo in ~5 seconds and returns
          structured calories and macros. Drop it into your fitness app,
          coaching platform, or corporate wellness program in an afternoon —
          not a quarter.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/embed"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] bg-[var(--accent)] text-white text-base font-semibold shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
            onClick={() => track("b2b_cta_click", { source: "hero_try_embed" })}
          >
            Try the embed
            <IconChevronRight size={18} />
          </a>
          <a
            href="#demo-form"
            className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] px-4 py-2"
            onClick={() => track("b2b_cta_click", { source: "hero_book_demo" })}
          >
            Book a 15-min demo →
          </a>
        </div>
      </section>

      {/* ─── What you get ─── */}
      <section className="px-5 pb-16 max-w-4xl w-full mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PitchCard
            title="Photo or text in"
            body="Your users snap a plate or type '2 eggs and toast'. We return structured items, calories, and macros. Confidence flag for ambiguous foods."
          />
          <PitchCard
            title="REST API, 2 endpoints"
            body="POST /v1/estimate {text} or {image}. JSON back in ~3-5 seconds. Idempotent. Rate-limited per key. Same model that powers Calora's consumer app."
          />
          <PitchCard
            title="White-label ready"
            body="No Calora branding in the response. You own the UX; we run the AI. Ship with your logo, your colors, your copy."
          />
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        id="pricing"
        className="px-5 py-16 bg-[var(--surface-soft)] border-y border-[var(--hairline)]"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)] text-center mb-2">
            Pay per estimate, or flat monthly
          </h2>
          <p className="text-center text-[14px] text-[var(--ink-soft)] mb-10 max-w-xl mx-auto">
            No seats. No minimums on the per-estimate plan. Cancel anytime.
            Annual flat plans include priority routing and a 99.5% uptime SLA.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PriceCard
              name="Starter"
              price="$0.10"
              cadence="/estimate"
              features={[
                "Up to 2,000 estimates/mo",
                "Email support (48h)",
                "Calora branding in response header",
                "Self-serve keys via dashboard",
              ]}
              cta="Get a key"
              ctaHref="#demo-form"
            />
            <PriceCard
              name="Scale"
              price="$500"
              cadence="/month flat · 10k scans"
              highlight
              features={[
                "10,000 estimates/mo included",
                "$0.04 per estimate overage",
                "Slack/Discord support (4h)",
                "No header branding · white-label",
                "Uptime 99.5% SLA",
              ]}
              cta="Book a demo"
              ctaHref="#demo-form"
            />
            <PriceCard
              name="Enterprise"
              price="Custom"
              cadence="100k+ scans"
              features={[
                "Volume pricing",
                "Dedicated slack channel",
                "Custom model fine-tuning",
                "DPA + SOC2 paperwork on request",
                "Account manager",
              ]}
              cta="Email us"
              ctaHref="mailto:hello@calora.app?subject=Calora%20Enterprise"
            />
          </div>
        </div>
      </section>

      {/* ─── Live demo / embed link ─── */}
      <section id="demo" className="px-5 py-16 max-w-3xl mx-auto text-center">
        <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)] mb-3">
          See it in your stack in 60 seconds
        </h2>
        <p className="text-[15px] text-[var(--ink-soft)] max-w-xl mx-auto mb-6">
          We host a live, public embed demo at{" "}
          <Link
            href="/embed"
            className="text-[var(--accent)] underline underline-offset-2"
            onClick={() => track("b2b_cta_click", { source: "embed_link" })}
          >
            calora.develalfy.me/embed
          </Link>
          . Copy the snippet, drop it in any HTML page, no signup required.
        </p>
        <Link
          href="/embed"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--ink)] text-[var(--canvas)] font-semibold hover:opacity-90 transition"
          onClick={() => track("b2b_cta_click", { source: "bottom_embed" })}
        >
          Open the embed demo
          <IconChevronRight size={18} />
        </Link>
      </section>

      {/* ─── Lead capture form ─── */}
      <section
        id="demo-form"
        className="px-5 py-16 bg-[var(--surface-soft)] border-t border-[var(--hairline)]"
      >
        <div className="max-w-xl mx-auto">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)] text-center mb-2">
            Book a 15-min demo
          </h2>
          <p className="text-center text-[14px] text-[var(--ink-soft)] mb-8">
            We&apos;ll show you the live dashboard, walk through the embed
            code, and answer API questions. No slide deck — just the product.
          </p>

          {state === "ok" ? (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--canvas)] p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--macro-protein)]/10 text-[var(--macro-protein)] mb-3">
                <IconCheck size={24} />
              </div>
              <p className="text-[16px] font-semibold text-[var(--ink)]">
                Request received. We&apos;ll email you within 24 hours.
              </p>
              {position !== null && (
                <p className="text-[13px] text-[var(--ink-soft)] mt-2">
                  You&apos;re #{position} in the B2B demo queue.
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--canvas)] p-6"
            >
              <Field label="Work email" name="email" type="email" required />
              <Field label="Company" name="company" type="text" required />

              <div>
                <label
                  htmlFor="use_case"
                  className="block text-[12px] font-medium text-[var(--ink-soft)] mb-1.5 uppercase tracking-wide"
                >
                  What are you building?
                </label>
                <select
                  id="use_case"
                  name="use_case"
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-soft)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                >
                  <option value="" disabled>
                    Pick one…
                  </option>
                  <option value="fitness_app">Fitness / workout app</option>
                  <option value="coaching">Nutrition coaching platform</option>
                  <option value="wellness">Corporate wellness program</option>
                  <option value="healthcare">Healthcare / dietetic program</option>
                  <option value="creator">Creator / influencer tool</option>
                  <option value="other">Something else</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="monthly_estimates"
                  className="block text-[12px] font-medium text-[var(--ink-soft)] mb-1.5 uppercase tracking-wide"
                >
                  Estimated monthly volume
                </label>
                <select
                  id="monthly_estimates"
                  name="monthly_estimates"
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-soft)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                >
                  <option value="" disabled>
                    Pick one…
                  </option>
                  <option value="under_1k">Under 1,000</option>
                  <option value="1k_10k">1,000 – 10,000</option>
                  <option value="10k_100k">10,000 – 100,000</option>
                  <option value="over_100k">Over 100,000</option>
                  <option value="unknown">Not sure yet</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-[12px] font-medium text-[var(--ink-soft)] mb-1.5 uppercase tracking-wide"
                >
                  Anything we should know? (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  placeholder="e.g. We currently use MFP API and it's killing our retention"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-soft)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={state === "submitting"}
                className="w-full px-5 py-3 rounded-[14px] bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] disabled:opacity-60"
              >
                {state === "submitting"
                  ? "Sending…"
                  : state === "err"
                  ? "Try again"
                  : "Book a demo"}
              </button>

              <p className="text-[12px] text-[var(--ink-soft)] text-center">
                Or email us directly at{" "}
                <a
                  href="mailto:hello@calora.app"
                  className="underline underline-offset-2"
                >
                  hello@calora.app
                </a>
                .
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-5 py-10 border-t border-[var(--hairline)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-2">
            <IconLeaf size={14} />
            <span>Calora · made with care</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[var(--ink)] transition">
              Consumer
            </Link>
            <Link href="/embed" className="hover:text-[var(--ink)] transition">
              Embed
            </Link>
            <Link href="/privacy" className="hover:text-[var(--ink)] transition">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Subcomponents (private — same pattern as app/page.tsx) ──────────────

function PitchCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--canvas)] p-5">
      <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--ink)] mb-1.5">
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
        {body}
      </p>
    </div>
  );
}

function PriceCard({
  name,
  price,
  cadence,
  features,
  cta,
  ctaHref,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 " +
        (highlight
          ? "border-[var(--accent)] bg-[var(--canvas)] shadow-[0_10px_30px_-12px_rgba(255,111,77,0.35)]"
          : "border-[var(--hairline)] bg-[var(--canvas)]")
      }
    >
      <h3 className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[var(--ink)] mb-1">
        {name}
      </h3>
      <div className="mb-4">
        <span className="text-[26px] font-semibold text-[var(--ink)] tracking-tight">
          {price}
        </span>{" "}
        <span className="text-[13px] text-[var(--ink-soft)]">{cadence}</span>
      </div>
      <ul className="space-y-1.5 text-[13px] text-[var(--ink-soft)] mb-5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <IconCheck size={14} className="mt-0.5 shrink-0 text-[var(--macro-protein)]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={
          "block w-full text-center px-4 py-2.5 rounded-[12px] font-semibold text-sm transition " +
          (highlight
            ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)]"
            : "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--hairline)]")
        }
      >
        {cta}
      </Link>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[12px] font-medium text-[var(--ink-soft)] mb-1.5 uppercase tracking-wide"
      >
        {label}
        {required ? <span className="text-[var(--accent)]"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={name === "email" ? "email" : "organization"}
        className="w-full px-4 py-3 rounded-xl bg-[var(--surface-soft)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      />
    </div>
  );
}
