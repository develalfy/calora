// 404 page — Next.js renders this for any unmatched route in the App Router.
// Replaces the default "404 | This page could not be found" with on-brand UX.

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-5 bg-[var(--canvas)]">
      <div className="max-w-md w-full text-center">
        <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
          404
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
          That page is off the menu.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
          The link you followed doesn&apos;t lead anywhere. Try the app, or head
          back home.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link
            href="/app"
            className="px-5 py-3 rounded-full bg-[var(--accent)] text-white text-sm font-semibold shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
          >
            Open Calora
          </Link>
          <Link
            href="/"
            className="px-5 py-3 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}