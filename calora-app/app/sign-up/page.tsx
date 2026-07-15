"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// useSearchParams() in Next.js 15+ MUST be inside a <Suspense> boundary.
// This is the inner component that actually reads the search param.
// The page-level default export wraps this in <Suspense>.

/** Build a "/sign-in?next=…" href that preserves the user's intended
 *  return path. Mirror of the helper in app/sign-in/page.tsx so both
 *  cross-links round-trip the next= context. */
function signInHref(next: string | null): string {
  if (!next) return "/sign-in";
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

function SignUpForm() {
  const params = useSearchParams();
  const nextPath = params.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
        credentials: "same-origin",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.error === "email_taken") setErr("That email is already registered.");
        else if (j.error === "rate_limited") setErr("Too many attempts. Try again in a minute.");
        else if (j.error === "weak_password") setErr("Password must be 8-72 characters.");
        else if (j.error === "invalid_email") setErr("That email doesn't look right.");
        else setErr("Sign-up failed. Please try again.");
        return;
      }
      // HARD navigation (not router.push). This is the critical fix for
      // the cookie-persistence bug — the browser processes Set-Cookie
      // during a full page load, so the destination page's request
      // includes the new session cookie.
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
          Create your account
        </h1>
        <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
          Free tier: 5 scans/day, no credit card. Upgrade to Pro for unlimited.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="su-name" className="block text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)] mb-1">
              Name (optional)
            </label>
            <input
              id="su-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Alex"
            />
          </div>

          <div>
            <label htmlFor="su-email" className="block text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)] mb-1">
              Email
            </label>
            <input
              id="su-email"
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
            <label htmlFor="su-pw" className="block text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)] mb-1">
              Password
            </label>
            <input
              id="su-pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-[12px] text-[var(--ink-muted)]">8 to 72 characters. We never store or send this in plain text.</p>
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
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-[12px] text-[var(--ink-muted)] text-center">
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}

export default function SignUpPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      <Suspense fallback={<div className="flex-1" />}>
        <HeaderWithNext />
      </Suspense>
      <Suspense fallback={<div className="flex-1" />}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}

/** Header that forwards ?next= into the cross-link to /sign-in so the
 *  user's intended return path isn't dropped when they already have an
 *  account but landed on /sign-up via deep-link. */
function HeaderWithNext() {
  const params = useSearchParams();
  const next = params.get("next");
  return (
    <header className="px-5 pt-6 pb-4 max-w-5xl w-full mx-auto flex items-center justify-between">
      <Link href="/" className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
        calora
      </Link>
      <Link href={signInHref(next)} className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
        Have an account? Sign in
      </Link>
    </header>
  );
}