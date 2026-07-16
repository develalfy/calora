// Public marketing page at / (calora.develalfy.me)
// The actual app lives at /app.
//
// Why split: Google ranks marketing copy; the app shell confuses crawlers and
// doesn't convert visitors. Visitors land on /, click "Try Calora", get sent
// to /app where the localStorage-first experience lives.
//
// Pricing is a placeholder pending the market analysis landing. The page
// intentionally avoids fake scarcity, dark patterns, and testimonial fabrication.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCamera, IconCheck, IconChevronRight, IconLeaf, IconSparkle } from "@/components/Icons";
import {
  readRefFromUrl,
  setRefCookieClient,
} from "@/lib/attribution";

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      {/* ─── Nav ─── */}
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
          calora
        </span>
        <nav className="flex items-center gap-1">
          <a
            href="#how"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            How it works
          </a>
          <Link
            href="/pricing"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Pricing
          </Link>
          <a
            href="#faq"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            FAQ
          </a>
          <Link
            href="/try"
            className="hidden sm:inline-block px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition"
          >
            Try without signup
          </Link>
          <Link
            href="/b2b"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            For Teams
          </Link>
          <Link
            href="/sign-in"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--canvas)] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition"
          >
            Sign up free
          </Link>
          <Link
            href="/app"
            className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="px-5 pt-8 pb-16 max-w-3xl w-full mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-soft)] text-[12px] font-medium text-[var(--ink-soft)] mb-6">
          <IconSparkle size={14} />
          <span>AI reads your plate in ~5 seconds</span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-[44px] sm:text-[56px] leading-[1.05] font-semibold tracking-[-0.025em] text-[var(--ink)]">
          Snap a meal.
          <br />
          <span className="text-[var(--accent)]">Know your calories.</span>
        </h1>

        <p className="mt-5 text-[17px] leading-relaxed text-[var(--ink-soft)] max-w-xl mx-auto">
          Calora reads your plate, estimates calories and macros, and lets you
          edit anything before saving. No barcode hunting. No database
          searching. No 30-second food logs.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/try"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] bg-[var(--accent)] text-white text-base font-semibold shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
          >
            <IconCamera size={20} />
            Try now — no signup
            <IconChevronRight size={18} />
          </Link>
          <Link
            href="/sign-up"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] bg-[var(--ink)] text-[var(--canvas)] text-base font-semibold hover:opacity-90 active:scale-[0.98] transition"
          >
            Sign up free
          </Link>
        </div>

        <p className="mt-5 text-[12px] text-[var(--ink-muted)]">
          Or jump straight to{" "}
          <Link href="/app" className="underline underline-offset-2 hover:text-[var(--ink-soft)]">
            the full app
          </Link>
          . 5 free scans per day after signup.
        </p>

        {/* ─── Pro waitlist capture ───
            Pre-launch demand signal: collects emails before we wire Stripe.
            Shown once a real signup flow exists; this is the cheaper experiment. */}
        <div className="mt-10">
          <WaitlistForm />
        </div>
      </section>

      {/* ─── Demo screenshot block ─── */}
      <section className="px-5 pb-20 max-w-3xl w-full mx-auto">
        <div className="rounded-[28px] bg-[var(--surface-card)] border border-[var(--hairline)] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.12)] p-6 sm:p-8">
          <div className="aspect-[4/3] rounded-[20px] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface-soft)] flex items-center justify-center relative overflow-hidden">
            {/* Mockup of the camera UI */}
            <div className="absolute inset-6 rounded-[16px] border-2 border-dashed border-[var(--accent)]/40 flex flex-col items-center justify-center text-center">
              <IconCamera size={48} />
              <p className="mt-3 text-[15px] font-semibold text-[var(--ink)]">
                Snap a photo
              </p>
              <p className="text-[12px] text-[var(--ink-muted)] mt-1">
                or describe it below
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how" className="px-5 py-20 bg-[var(--surface-soft)] border-y border-[var(--hairline)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] mb-2">
              How it works
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-[32px] sm:text-[40px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
              Three steps. No homework.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Step
              n="1"
              title="Snap or describe"
              body="Take a photo of your meal, or just type what you ate. No barcode scanning, no database searching."
            />
            <Step
              n="2"
              title="AI reads it"
              body="Calora identifies the foods, estimates portions, and returns calories plus protein, carbs, and fat."
            />
            <Step
              n="3"
              title="Edit & save"
              body="Tap any item to adjust the amount or fix the name. Save the meal and move on with your day."
            />
          </div>
        </div>
      </section>

      {/* ─── Why Calora ─── */}
      <section className="px-5 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] mb-2">
            Why Calora
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-[32px] sm:text-[40px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Built for the meal, not the database.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Feature
            title="Under 10 seconds per meal"
            body="Other apps take 30-60 seconds per meal because you hunt through food lists. Calora takes a photo or one sentence."
          />
          <Feature
            title="Edit before you save"
            body="Don't like the AI's portion estimate? Tap the number and adjust. No 'accept all or start over.'"
          />
          <Feature
            title="Your data stays on your device"
            body="No account required for the free tier. Your meal log lives in your browser. Export to CSV whenever you want."
          />
          <Feature
            title="Works on every device"
            body="iPhone, Android, laptop, desktop — Calora is a Progressive Web App. No app store gate, instant install."
          />
          <Feature
            title="Privacy by default"
            body="We don't sell your data. We don't show you ads. Your photos are processed by an AI and discarded."
          />
          <Feature
            title="Honest about accuracy"
            body="Calora shows confidence levels on every estimate. If the AI is unsure, you'll know before you save."
          />
        </div>
      </section>

      {/* ─── Pricing (placeholder pending market research) ─── */}
      <section id="pricing" className="px-5 py-20 bg-[var(--surface-soft)] border-y border-[var(--hairline)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] mb-2">
              Pricing
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-[32px] sm:text-[40px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
              Free to start. Fair when you need more.
            </h2>
            <p className="mt-3 text-[15px] text-[var(--ink-soft)]">
              No credit card to try. Cancel anytime.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free tier */}
            <PriceCard
              name="Free"
              price="$0"
              cadence="forever"
              highlight={false}
              features={[
                "5 meal scans per day",
                "Photo and text logging",
                "Edit any estimate before saving",
                "Daily macro summary",
                "Data stays on your device",
              ]}
              cta={
                <Link
                  href="/app"
                  className="block w-full text-center px-5 py-3 rounded-[14px] bg-[var(--surface-strong)] text-[var(--ink)] font-semibold hover:bg-[var(--surface-soft)] transition"
                >
                  Start free
                </Link>
              }
            />

            {/* Pro tier */}
            <PriceCard
              name="Pro"
              price="$4.99"
              cadence="/month"
              highlight
              features={[
                "Unlimited scans",
                "Sync across devices",
                "Weekly progress emails",
                "Priority AI accuracy",
                "7-day free trial — no surprise charges",
              ]}
              cta={
                <Link
                  href="/app"
                  className="block w-full text-center px-5 py-3 rounded-[14px] bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)]"
                >
                  Start 7-day free trial
                </Link>
              }
            />
          </div>

          <div className="mt-8 text-center text-[12px] text-[var(--ink-muted)] space-y-1">
            <p>
              Annual plan: <span className="font-semibold text-[var(--ink-soft)]">$39.99/year</span>{" "}
              (save 33% vs monthly, $3.33/month equivalent).
            </p>
            <p>
              We&apos;ll email you 24 hours before your trial ends. Cancel anytime,
              no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Disclaimer ─── */}
      <section className="px-5 py-12 max-w-3xl mx-auto text-center">
        <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed">
          Calora is not a medical device. Calorie and macro estimates are
          approximations generated by AI and may be inaccurate by 15-30%.
          Please consult a qualified professional for medical nutrition advice.
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="px-5 py-20 bg-[var(--surface-soft)] border-t border-[var(--hairline)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)] text-center mb-10">
            Questions
          </h2>
          <div className="space-y-6">
            <Faq q="Does it work on my phone?">
              Calora is a Progressive Web App — install it from your browser to
              your home screen. Works on iOS 16+ and Android 9+ without an app
              store.
            </Faq>
            <Faq q="How accurate is the AI?">
              For common plated meals, expect ±20%. For ambiguous foods (mixed
              salads, sauces), Calora marks the estimate &quot;low confidence&quot;
              so you know to double-check.
            </Faq>
            <Faq q="Is my data private?">
              On the free tier, your meal log lives in your browser and never
              leaves your device. When Pro launches, you can opt to sync
              across devices — encrypted, never sold, never shared.
            </Faq>
            <Faq q="Why not just use MyFitnessPal?">
              MFP is great if you enjoy searching through 11 million foods and
              manually weighing portions. Calora is for everyone else — open
              the app, snap the plate, done.
            </Faq>
            <Faq q="When does Pro launch?">
              Pro is live now at $4.99/month or $39.99/year, with a 7-day free
              trial. We&apos;re still validating features, so early Pro users
              get grandfathered pricing for life.
            </Faq>
          </div>
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
            <Link href="/app" className="hover:text-[var(--ink)] transition">
              Open app
            </Link>
            <Link href="/privacy" className="hover:text-[var(--ink)] transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--ink)] transition">
              Terms
            </Link>
            <a href="mailto:hello@calora.app" className="hover:text-[var(--ink)] transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Subcomponents
// ───────────────────────────────────────────────────────────────────────────

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-[20px] bg-[var(--surface-card)] border border-[var(--hairline)] p-6">
      <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-semibold text-sm mb-4">
        {n}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)] mb-2">
        {title}
      </h3>
      <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed">{body}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[16px] bg-[var(--surface-card)] border border-[var(--hairline)] p-5">
      <div className="flex items-start gap-3">
        <IconCheck size={18} />
        <div>
          <h3 className="font-semibold text-[var(--ink)] mb-1">{title}</h3>
          <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function PriceCard({
  name,
  price,
  cadence,
  highlight,
  features,
  cta,
}: {
  name: string;
  price: string;
  cadence: string;
  highlight: boolean;
  features: string[];
  cta: React.ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-[24px] p-7 flex flex-col",
        highlight
          ? "bg-[var(--accent)] text-white shadow-[0_24px_48px_-16px_rgba(255,111,77,0.5)]"
          : "bg-[var(--surface-card)] border border-[var(--hairline)]",
      ].join(" ")}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <h3
          className={[
            "font-[family-name:var(--font-display)] text-[24px] font-semibold tracking-[-0.01em]",
            highlight ? "text-white" : "text-[var(--ink)]",
          ].join(" ")}
        >
          {name}
        </h3>
      </div>
      <div className="flex items-baseline gap-1.5 mb-5">
        <span
          className={[
            "font-[family-name:var(--font-display)] text-[40px] font-semibold tracking-[-0.02em]",
            highlight ? "text-white" : "text-[var(--ink)]",
          ].join(" ")}
        >
          {price}
        </span>
        {cadence && (
          <span
            className={[
              "text-[13px]",
              highlight ? "text-white/80" : "text-[var(--ink-muted)]",
            ].join(" ")}
          >
            {cadence}
          </span>
        )}
      </div>

      <ul className="space-y-2.5 mb-7 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13.5px]">
            <IconCheck
              size={16}
              className={highlight ? "text-white mt-0.5 shrink-0" : "text-[var(--accent)] mt-0.5 shrink-0"}
            />
            <span className={highlight ? "text-white/95" : "text-[var(--ink-soft)]"}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <div>{cta}</div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--hairline)] pb-5">
      <h3 className="font-semibold text-[var(--ink)] mb-2">{q}</h3>
      <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed">
        {children}
      </p>
    </div>
  );
}

// ─── WaitlistForm ───────────────────────────────────────────────────────────
// Captures pre-launch email interest for Calora Pro. Posts to /api/waitlist,
// which appends to a JSONL file in the running container (no external
// service needed for the MVP). Once we hit Stripe, the form gets replaced
// with a Checkout button — same shape, same position.
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    "idle" | "submitting" | "ok" | "duplicate" | "error"
  >("idle");
  const [count, setCount] = useState<number | null>(null);

  // Fetch the current count once on mount so we can show "Join 47 others".
  useEffect(() => {
    let alive = true;
    // First-touch attribution: if the URL has ?ref=... (creator campaign
    // link), set the cookie so signup captures the partner that drove the
    // visit. setRefCookieClient is a no-op if the cookie already exists —
    // first-touch wins.
    const ref = readRefFromUrl(
      typeof window !== "undefined" ? window.location.href : null,
    );
    if (ref) setRefCookieClient(ref);

    fetch("/api/waitlist", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((j) => {
        if (alive) setCount(typeof j.count === "number" ? j.count : 0);
      })
      .catch(() => {
        if (alive) setCount(0);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    const v = email.trim();
    if (!v) return;
    setState("submitting");
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 10_000);
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, source: "landing_hero" }),
        signal: ac.signal,
      });
      clearTimeout(t);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (data.alreadyThere) setState("duplicate");
        else {
          setState("ok");
          if (typeof data.count === "number") setCount(data.count);
        }
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "ok" || state === "duplicate") {
    return (
      <div className="max-w-md mx-auto rounded-2xl bg-[var(--surface-card)] border border-[var(--hairline)] px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <IconCheck size={18} />
        </div>
        <div className="text-left">
          <p className="text-[14px] font-semibold text-[var(--ink)]">
            {state === "ok" ? "You're on the list." : "Already on the list."}
          </p>
          <p className="text-[12px] text-[var(--ink-soft)]">
            We'll email you when Pro opens — usually within a few weeks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-md mx-auto rounded-2xl bg-[var(--surface-card)] border border-[var(--hairline)] p-2.5 flex flex-col sm:flex-row gap-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]"
    >
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        disabled={state === "submitting"}
        aria-label="Email for Pro waitlist"
        className="flex-1 px-4 py-3 rounded-xl bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={state === "submitting"}
        className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white text-[14px] font-semibold hover:bg-[var(--accent-hover)] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {state === "submitting" ? "Adding…" : state === "error" ? "Try again" : "Notify me when Pro launches"}
      </button>
      {typeof count === "number" && count > 0 && (
        <p className="basis-full text-center text-[11px] text-[var(--ink-muted)] mt-1">
          {count} {count === 1 ? "person has" : "people have"} already signed up
        </p>
      )}
    </form>
  );
}