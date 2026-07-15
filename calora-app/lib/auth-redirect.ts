// lib/auth-redirect.ts — helper to build "/sign-in?next=…" or
// "/sign-up?next=…" URLs that preserve the user's intended return path
// across the sign-in <-> sign-up cross-link.
//
// Why this exists: a user arriving at /sign-in?next=/app who clicks
// "New here? Create account" used to land on bare /sign-up, losing
// their next= context. Both page-level cross-links now go through
// these helpers so the next= round-trips. Extracted from the page
// files so we can unit-test them without rendering React.

export function signInHrefWithNext(next: string | null | undefined): string {
  return authHref("/sign-in", next);
}

export function signUpHrefWithNext(next: string | null | undefined): string {
  return authHref("/sign-up", next);
}

/** Only allow same-origin paths (start with "/" and NOT "//"). A bad
 *  next param like "https://evil.example.com" would let an attacker
 *  redirect users post-login to their site. The route-handler side
 *  already validates this, but cheap to enforce here too. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (typeof next !== "string") return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null; // protocol-relative URL
  return next;
}

function authHref(target: "/sign-in" | "/sign-up", next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (!safe) return target;
  return `${target}?next=${encodeURIComponent(safe)}`;
}