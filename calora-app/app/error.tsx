// Global error boundary — Next.js calls this when any page or layout throws.
// Required so a JS error shows a friendly message instead of a blank page.

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to whatever analytics sink is wired up.
    // eslint-disable-next-line no-console
    console.error("[calora] page error:", error);
  }, [error]);

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-5 bg-[var(--canvas)]">
      <div className="max-w-md w-full text-center">
        <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--accent)]">
          Something went wrong
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
          That hit a snag.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
          We hit an unexpected error rendering this page. Your data is safe on
          your device — nothing was lost.
        </p>
        {error.digest && (
          <p className="mt-3 text-[12px] font-mono text-[var(--ink-muted)]">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <button
            onClick={reset}
            className="px-5 py-3 rounded-full bg-[var(--accent)] text-white text-sm font-semibold shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-3 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}