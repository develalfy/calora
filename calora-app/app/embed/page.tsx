// /embed — Live, public, paste-this-snippet demo of Calora's meal estimator.
//
// Goal: a B2B prospect can land here, paste a meal description, see the
// result in ~5 seconds, then copy the snippet to their own page.
//
// Architecture:
//   - Calls /api/demo-estimate (public, no auth, strict rate limit)
//   - No sessionStorage, no localStorage persistence — this is a demo
//   - Embeddable widget: a minimal <CaloraWidget text=... /> component pattern
//     is documented below, with the fetch shape spelled out
//
// Why it exists: the B2B pitch page (/b2b) sends prospects here to "see it
// working before scheduling a call". Rate limits are tighter than /api/estimate
// so abuse on this public page doesn't burn the AI budget.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import {
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconLeaf,
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
  "2 scrambled eggs with butter and toast",
  "chicken caesar salad, large",
  "oat latte plus a croissant",
  "chipotle bowl with chicken, brown rice, beans",
];

export default function EmbedPage() {
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    "lunch",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrySec, setRetrySec] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track("embed_view", {});
  }, []);

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    track("embed_demo_call", { meal });
    try {
      const res = await fetch("/api/demo-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), context: { meal } }),
      });
      if (res.status === 429) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; retry_after_sec?: number };
        setError(
          j.error ?? "Demo rate limit reached — sign up free for 5 scans/day.",
        );
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const snippet = `<script>
  // Drop this into any HTML page. Calls /api/demo-estimate on submit.
  // For production use, get an API key at hello@calora.app.
  async function estimate(meal) {
    const text = document.getElementById("calora-text").value;
    const res = await fetch("https://calora.develalfy.me/api/demo-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, context: { meal } }),
    });
    const data = await res.json();
    document.getElementById("calora-result").innerText =
      data.totals.calories + " kcal";
  }
</script>
<input id="calora-text" placeholder="2 eggs and toast">
<button onclick="estimate('lunch')">Estimate</button>
<div id="calora-result"></div>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no clipboard API */
    }
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      {/* Nav (matches /b2b for cross-link consistency) */}
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]"
        >
          calora <span className="text-[var(--accent)]">/</span> embed
        </Link>
        <nav className="flex items-center gap-1">
          <a
            href="#demo"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Live demo
          </a>
          <a
            href="#snippet"
            className="hidden sm:inline-block px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Embed code
          </a>
          <Link
            href="/b2b"
            className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
          >
            Book a demo
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-5 pt-8 pb-8 max-w-3xl w-full mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-soft)] text-[12px] font-medium text-[var(--ink-soft)] mb-6">
          <IconSparkle size={14} />
          <span>No signup · ~5 seconds · REST POST</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[36px] sm:text-[44px] leading-[1.1] font-semibold tracking-[-0.025em] text-[var(--ink)]">
          Try the AI live.
          <br />
          <span className="text-[var(--accent)]">Paste the snippet.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-soft)] max-w-xl mx-auto">
          This page is the demo. The same API powers the widget below and your
          own page when you copy the snippet. JSON in, JSON out.
        </p>
      </section>

      {/* Widget demo */}
      <section
        id="demo"
        className="px-5 pb-12 max-w-2xl w-full mx-auto"
      >
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--canvas)] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3 text-[12px] text-[var(--ink-soft)]">
            <IconCamera size={14} />
            <span className="font-semibold uppercase tracking-wide">
              Live widget
            </span>
          </div>

          {/* Meal-type picker — keeps the demo behavior symmetric with the real app */}
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
            htmlFor="embed-text"
            className="block text-[12px] font-medium text-[var(--ink-soft)] mb-1.5 uppercase tracking-wide"
          >
            What did you eat?
          </label>
          <input
            id="embed-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 scrambled eggs with toast"
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface-soft)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="px-3 py-1.5 rounded-full text-[12px] text-[var(--ink-soft)] bg-[var(--surface-soft)] hover:bg-[var(--hairline)] transition"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            onClick={run}
            disabled={loading || !text.trim()}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] disabled:opacity-60"
          >
            <IconSparkle size={16} />
            {loading ? "Estimating…" : "Estimate calories"}
            {!loading && <IconChevronRight size={16} />}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-5 rounded-xl bg-[var(--surface-soft)] p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-[family-name:var(--font-display)] text-[32px] font-semibold tracking-tight text-[var(--ink)]">
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
                    {result._meta.model} · {result._meta.latency_ms}ms
                  </span>
                )}
              </div>
              {result.notes && (
                <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
                  {result.notes}
                </p>
              )}
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
                    className="underline underline-offset-2 text-[var(--accent)]"
                  >
                    sign up free
                  </Link>{" "}
                  for 5 daily scans
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Snippet */}
      <section
        id="snippet"
        className="px-5 py-12 bg-[var(--surface-soft)] border-y border-[var(--hairline)]"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="font-[family-name:var(--font-display)] text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink)] mb-2">
            Embed in 6 lines
          </h2>
          <p className="text-[14px] text-[var(--ink-soft)] mb-4">
            Copy this snippet into any HTML page. Public demo endpoint — for
            production use (your own branding, your rate limits),{" "}
            <Link
              href="/b2b"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              get an API key
            </Link>
            .
          </p>

          <div className="relative rounded-xl bg-[#0f0f0f] p-4 overflow-x-auto">
            <button
              onClick={copy}
              className="absolute top-3 right-3 px-3 py-1 rounded-md text-[12px] bg-white/10 text-white hover:bg-white/20 transition"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="text-[12px] leading-[1.55] text-[#d4d4d8] font-mono whitespace-pre">
              {snippet}
            </pre>
          </div>

          <p className="mt-3 text-[12px] text-[var(--ink-soft)]">
            Production keys include white-label JSON (no <code>_meta</code>
            field, custom <code>notes</code>), higher rate limits, and an
            uptime SLA. See{" "}
            <Link
              href="/b2b"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              pricing
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Footer */}
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
            <Link href="/b2b" className="hover:text-[var(--ink)] transition">
              B2B
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
