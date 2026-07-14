// Root loading state — Next.js shows this during route transitions and data fetches.
// Pure visual; uses Tailwind-equivalent inline styles so it works in any layout.

export default function Loading() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-[var(--canvas)]">
      <div className="flex flex-col items-center gap-3" aria-live="polite">
        <div
          className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
          Loading
        </p>
      </div>
    </main>
  );
}