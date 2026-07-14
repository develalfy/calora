"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

// In a real backend this would POST to /api/auth/forgot-password, which
// would email a reset link. We don't have an email provider configured,
// so this page is a UI-only placeholder that explains what to do.

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
          calora
        </Link>
        <Link href="/sign-in" className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
          Back to sign in
        </Link>
      </header>

      <section className="flex-1 flex items-start justify-center pt-10 pb-16 px-5">
        <div className="w-full max-w-[420px]">
          <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
            Reset your password
          </h1>

          {!submitted ? (
            <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
              <p className="text-[14px] text-[var(--ink-soft)]">
                Enter the email you signed up with and we'll send a reset link.
              </p>
              <div>
                <label htmlFor="fp-email" className="block text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-4 rounded-2xl bg-[var(--accent)] text-white text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition"
              >
                Send reset link
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-[14px] text-[var(--ink)]">
                If <span className="font-semibold">{email}</span> matches an account,
                a reset link is on its way.
              </p>
              <p className="mt-3 text-[12px] text-[var(--ink-muted)]">
                Email delivery isn't wired up yet — once it is, this page will send a real link.
                For now, contact support@develalfy.me to reset your password manually.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}