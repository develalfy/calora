"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Me = {
  id: string;
  email: string;
  name: string | null;
  createdAt: number;
  lastLoginAt: number | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        const j = await r.json();
        if (cancelled) return;
        if (j.user) {
          setMe(j.user);
        } else {
          // Not logged in — kick to sign-in.
          window.location.href = "/sign-in?next=/account";
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      // HARD nav so the cleared cookie is fully processed before the next page.
      window.location.href = "/";
    }
  }

  if (loading) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-[var(--canvas)]">
        <div className="text-[14px] text-[var(--ink-muted)]">Loading…</div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-[var(--canvas)]">
        <div className="text-center">
          <p className="text-[14px] text-[var(--ink-muted)]">Redirecting…</p>
        </div>
      </main>
    );
  }

  const memberSince = new Date(me.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lastLogin = me.lastLoginAt
    ? new Date(me.lastLoginAt).toLocaleString()
    : "—";

  return (
    <main className="min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      <header className="px-5 pt-6 pb-4 max-w-3xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
          calora
        </Link>
        <Link href="/app" className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
          Open app
        </Link>
      </header>

      <section className="flex-1 px-5 py-8 max-w-3xl w-full mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-[34px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
          Account
        </h1>

        <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                Signed in as
              </p>
              <p className="mt-1 text-[18px] font-semibold text-[var(--ink)] break-all">
                {me.name || me.email}
              </p>
              {me.name && (
                <p className="mt-0.5 text-[14px] text-[var(--ink-soft)] break-all">{me.email}</p>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-[var(--ink-muted)]">Member since</dt>
              <dd className="mt-1 font-medium text-[var(--ink)]">{memberSince}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">Last sign-in</dt>
              <dd className="mt-1 font-medium text-[var(--ink)]">{lastLogin}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6">
          <h2 className="text-[16px] font-semibold text-[var(--ink)]">Plan</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
            You're on the Free tier — 5 scans per day, stored on this device. Cloud sync and Pro are coming next.
          </p>
          <button
            disabled
            className="mt-4 w-full sm:w-auto px-5 py-3 rounded-2xl bg-[var(--accent)] text-white text-[14px] font-semibold opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            Upgrade to Pro — coming soon
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6">
          <h2 className="text-[16px] font-semibold text-[var(--ink)]">Session</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
            You stay signed in for 30 days. Sign out below if you're on a shared device.
          </p>
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="mt-4 w-full sm:w-auto px-5 py-3 rounded-2xl bg-[var(--ink)] text-[var(--canvas)] text-[14px] font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

        <div className="mt-8 text-[12px] text-[var(--ink-muted)] text-center">
          Questions? <a href="mailto:support@develalfy.me" className="underline">support@develalfy.me</a>
        </div>
      </section>
    </main>
  );
}