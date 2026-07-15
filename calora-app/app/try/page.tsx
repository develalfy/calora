// /try — anon, no-signup meal estimator.
//
// This is Calora's top-of-funnel. A visitor pastes a meal description,
// gets a 5-second AI estimate, sees the calories + macros, then sees a
// sign-up CTA to "save your log + get 5 daily scans".
//
// Why a dedicated page (vs. the /app shell):
//   - /app requires auth (gated 2026-07-15 to protect AI budget)
//   - Forcing signup BEFORE value is the #1 reason MyFitnessPal loses
//     70% of new users in week 1 — they don't know if the app is worth
//     their email yet
//   - /try gives the value in 5 seconds, asks for signup AFTER the
//     user has decided the AI is good
//
// The back-end is /api/demo-estimate (added in the previous commit). The
// route already:
//   - rate-limits per IP (3/min, 20/hr, 200/day)
//   - sends 429/400/413 responses with a `cta` object pointing at /sign-up
//   - requires no auth, no session, no cookie

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import {
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconSparkle,
} from "@/components/Icons";

interface EstimateItem {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
interface EstimateResponse {
  items: EstimateItem[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  confidence: "high" | "medium" | "low";
  notes: string;
  _meta?: { latency_ms: number; model: string };
}

const EXAMPLES = [
  { text: "2 scrambled eggs with butter and toast", meal: "breakfast" as const },
  { text: "chicken caesar salad, large", meal: "lunch" as const },
  { text: "spaghetti bolognese, big bowl", meal: "dinner" as const },
  { text: "apple and a handful of almonds", meal: "snack" as const },
];

export default function TryPage() {
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    "lunch",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrySec, setRetrySec] = useState<number | null>(null);

  useEffect(() => {
    track("try_view", {});
  }, []);

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    track("try_estimate_start", { meal });
    try {
      const res = await fetch("/api/demo-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), context: { meal } }),
      });
      if (res.status === 429) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          retry_after_sec?: number;
        };
        setError(j.error ?? "Rate limit hit — sign up free for more.");
        setRetrySec(j.retry_after_sec ?? 60);
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "AI provider error");
        return;
      }
      const data = (await res.json()) as EstimateResponse;
      setResult(data);
      track("try_estimate_complete", {
        meal,
        calories: data.totals.calories,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      {/* Nav */}
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]"
        >
          calora <span className="text-[var(--accent)]">/</span> try
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/sign-in"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--canvas)] text-sm font-semibold hover:opacity-90 transition"
          >
            Sign up free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-5 pt-8 pb-6 max-w-2xl w-full mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-soft)] text-[12px] font-medium text-[var(--ink-soft)] mb-4">
          <IconSparkle size={14} />
          <span>No signup · No email · AI reads your plate in ~5 seconds</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[36px] sm:text-[44px] leading-[1.1] font-semibold tracking-[-0.025em] text-[var(--ink)]">
          Try the AI.
          <br />
          <span className="text-[var(--accent)]">No signup needed.</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
          Type what you ate. We&apos;ll estimate calories and macros. If you
          like it, sign up to save your log + get 5 daily scans + sync across
          devices.
        </p>
      </section>

      {/* Widget */}
      <section className="px-5 pb-10 max-w-2xl w-full mx-auto">
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--canvas)] p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
          {/* Meal picker */}
          <fieldset
            role="radiogroup"
            aria-label="Meal type"
            className="flex flex-wrap gap-2 mb-3"
          >
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={meal === m}
                onClick={() => setMeal(m)}
                className={
                  "px-3 py-1.5 rounded-full text-[13px] font-medium border transition " +
                  (meal === m
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-transparent text-[var(--ink-soft)] border-[var(--hairline)] hover:border-[var(--ink-soft)]")
                }
              >
                {m}
              </button>
            ))}
          </fieldset>

          <label
            htmlFor="try-text"
            className="block text-[12px] font-medium text-[var(--ink-soft)] mb-1.5 uppercase tracking-wide"
          >
            What did you eat?
          </label>
          <input
            id="try-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 scrambled eggs with toast"
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface-soft)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            autoFocus
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.text}
                onClick={() => {
                  setText(ex.text);
                  setMeal(ex.meal);
                }}
                className="px-3 py-1.5 rounded-full text-[12px] text-[var(--ink-soft)] bg-[var(--surface-soft)] hover:bg-[var(--hairline)] transition"
              >
                {ex.text}
              </button>
            ))}
          </div>

          <button
            onClick={run}
            disabled={loading || !text.trim()}
            data-testid="try-estimate"
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] disabled:opacity-60"
          >
            <IconCamera size={18} />
            {loading ? "Estimating…" : "Estimate calories"}
            {!loading && <IconChevronRight size={18} />}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-5 rounded-xl bg-[var(--surface-soft)] p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span
                  className="font-[family-name:var(--font-display)] text-[36px] font-semibold tracking-tight text-[var(--ink)]"
                  data-testid="try-calories"
                >
                  {result.totals.calories}
                </span>
                <span className="text-[14px] text-[var(--ink-soft)]">kcal</span>
                <span
                  className={
                    "ml-auto text-[11px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full " +
                    (result.confidence === "high"
                      ? "bg-[var(--macro-protein)]/15 text-[var(--macro-protein)]"
                      : result.confidence === "medium"
                        ? "bg-[var(--macro-carbs)]/15 text-[var(--macro-carbs)]"
                        : "bg-[var(--ink-muted)]/15 text-[var(--ink-soft)]")
                  }
                >
                  {result.confidence} confidence
                </span>
              </div>
              <ul className="text-[13px] text-[var(--ink-soft)] space-y-1 mb-3">
                {result.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{it.name}</span>
                    <span className="tabular-nums">{it.calories} kcal</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 text-[12px] text-[var(--ink-soft)] border-t border-[var(--hairline)] pt-3">
                <span>P {result.totals.protein_g}g</span>
                <span>C {result.totals.carbs_g}g</span>
                <span>F {result.totals.fat_g}g</span>
                {result._meta && (
                  <span className="ml-auto">
                    {result._meta.latency_ms}ms
                  </span>
                )}
              </div>
              {result.notes && (
                <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
                  {result.notes}
                </p>
              )}

              {/* Signup CTA — shown ONLY after a result, when the user has
                  experienced the value and is most likely to convert. */}
              <div className="mt-4 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
                <div className="flex items-start gap-2">
                  <IconCheck
                    size={16}
                    className="mt-0.5 text-[var(--accent)] shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[var(--ink)]">
                      Like that? Sign up free to save it.
                    </p>
                    <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">
                      5 scans per day, weekly streak emails, log history, CSV
                      export. No card, no trial — just an account.
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Link
                    href="/sign-up"
                    onClick={() => track("try_to_signup", { from: "result_cta" })}
                    className="flex-1 text-center px-4 py-2 rounded-[10px] bg-[var(--accent)] text-white text-[13px] font-semibold hover:bg-[var(--accent-hover)] transition"
                  >
                    Sign up free
                  </Link>
                  <Link
                    href="/app"
                    className="flex-1 text-center px-4 py-2 rounded-[10px] bg-[var(--surface-soft)] text-[var(--ink)] text-[13px] font-semibold hover:bg-[var(--hairline)] transition"
                  >
                    Open app
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
              <p className="text-[13px] text-[var(--ink)]">{error}</p>
              {retrySec !== null && (
                <p className="text-[11px] text-[var(--ink-soft)] mt-1">
                  Try again in {retrySec}s · or{" "}
                  <Link
                    href="/sign-up"
                    onClick={() => track("try_to_signup", { from: "rate_limit" })}
                    className="underline underline-offset-2 text-[var(--accent)] font-semibold"
                  >
                    sign up free
                  </Link>{" "}
                  for 5 daily scans
                </p>
              )}
              {!retrySec && (
                <p className="text-[11px] text-[var(--ink-soft)] mt-1">
                  Want unlimited scans + sync across devices?{" "}
                  <Link
                    href="/sign-up"
                    onClick={() => track("try_to_signup", { from: "error" })}
                    className="underline underline-offset-2 text-[var(--accent)] font-semibold"
                  >
                    Sign up free
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Why sign up? Below-the-fold value props */}
        {!result && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Reason
              title="Save your log"
              body="Your meals stay across days and weeks. See streaks, totals, top items."
            />
            <Reason
              title="5 scans/day free"
              body="More than enough for breakfast/lunch/dinner — or text + photo combos."
            />
            <Reason
              title="No spam, no card"
              body="Just an account. Verify email, log meals. Cancel by deleting account."
            />
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="px-5 py-10 mt-auto border-t border-[var(--hairline)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-[var(--ink)] transition">
              Home
            </Link>
            <Link href="/b2b" className="hover:text-[var(--ink)] transition">
              For Teams
            </Link>
            <Link href="/embed" className="hover:text-[var(--ink)] transition">
              Embed
            </Link>
            <Link href="/privacy" className="hover:text-[var(--ink)] transition">
              Privacy
            </Link>
          </div>
          <span>Calora · made with care</span>
        </div>
      </footer>
    </main>
  );
}

function Reason({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-soft)] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-[14px] font-semibold text-[var(--ink)] mb-1">
        {title}
      </h3>
      <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">
        {body}
      </p>
    </div>
  );
}
