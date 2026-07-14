"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInForm() {
  const params = useSearchParams();
  const nextPath = params.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.error === "invalid_credentials") setErr("Wrong email or password.");
        else if (j.error === "rate_limited") setErr("Too many attempts. Try again in a minute.");
        else setErr("Sign-in failed. Please try again.");
        return;
      }
      // HARD navigation, not router.push. This is the critical cookie
      // fix — see comment in sign-up/page.tsx for the full reason.
      window.location.href = nextPath;
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex-1 flex items-start justify-center pt-10 pb-16 px-5">
      <div className="w-full max-w-[420px]">
        <h1 className="font-[family-name:var(--font-display)] text-[34px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
          Welcome back
        </h1>
        <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
          Sign in to keep your meal history in sync across devices.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="si-email" className="block text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)] mb-1">
              Email
            </label>
            <input
              id="si-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="si-pw" className="block text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                Password
              </label>
              <Link href="/forgot-password" className="text-[12px] text-[var(--accent)] hover:underline">
                Forgot?
              </Link>
            </div>
            <input
              id="si-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Your password"
            />
          </div>

          {err && (
            <p role="alert" className="text-[14px] text-[color:var(--error,#dc2626)] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl px-4 py-3">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-6 py-4 rounded-2xl bg-[var(--accent)] text-white text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60 transition"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
          calora
        </Link>
        <Link href="/sign-up" className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
          New here? Create account
        </Link>
      </header>
      <Suspense fallback={<div className="flex-1" />}>
        <SignInForm />
      </Suspense>
    </main>
  );
}