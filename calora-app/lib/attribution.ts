// lib/attribution.ts — referral attribution for Calora.
//
// Influencer/creator campaigns use URLs like calora.develalfy.me/?ref=ashraf
// or /sign-up?ref=ashraf to attribute signups to a partner. The campaign is
// paid out as 20% revenue-share for 12 months (see docs/outreach/revshare.md).
//
// What this module does:
//   - Read `ref` from a URL (search params or query string)
//   - Set / read a 90-day cookie `calora:ref` (first-touch attribution)
//   - Provide a getter the signup route can call to persist the ref on the
//     user record
//   - Validate the ref format to prevent header-injection / length abuse
//
// What this module does NOT do:
//   - Persist to the user record (signup route calls setRefOnUser)
//   - Rotate the ref (first-touch only — see analytics rationale)
//   - Expose a multi-touch model
//
// First-touch rationale: last-click attribution would let partners claim
// any signup that flowed through a paid ad. First-touch rewards the partner
// who actually brought the user in. Industry standard for creator programs.

export const REF_COOKIE_NAME = "calora:ref";
const REF_COOKIE_TTL_DAYS = 90;
const REF_MAX_LEN = 64;

// Allowed chars: lowercase letters, digits, dashes, underscores.
// Reject anything else to keep cookies clean and predictable.
const REF_VALID = /^[a-z0-9_-]{1,64}$/;

/**
 * Read the ref from a URL. Handles both URLSearchParams (server) and the
 * window.location.search (client). Returns null if missing or malformed.
 */
export function readRefFromUrl(url: URL | string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = typeof url === "string" ? new URL(url) : url;
  } catch {
    return null;
  }
  const raw = u.searchParams.get("ref");
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim();
  if (!REF_VALID.test(normalized)) return null;
  return normalized;
}

/**
 * Format a Set-Cookie header value (server-side). Use this in route handlers.
 */
export function buildRefCookie(ref: string): string {
  const expires = new Date(
    Date.now() + REF_COOKIE_TTL_DAYS * 24 * 3600 * 1000,
  ).toUTCString();
  return `${REF_COOKIE_NAME}=${ref}; Path=/; Expires=${expires}; SameSite=Lax; Secure`;
}

/**
 * Read the ref from a Cookie header value (server-side). Use this in route
 * handlers that want to attach the ref to a new user.
 */
export function readRefFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const name = p.slice(0, eq);
    if (name !== REF_COOKIE_NAME) continue;
    const val = decodeURIComponent(p.slice(eq + 1));
    if (!REF_VALID.test(val)) return null;
    return val;
  }
  return null;
}

/**
 * Read the ref from document.cookie (client-side). Mirror of the server
 * counterpart for client code that needs to know which ref is active.
 */
export function readRefFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const all = document.cookie.split(/;\s*/);
  for (const p of all) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    if (p.slice(0, eq) !== REF_COOKIE_NAME) continue;
    const val = decodeURIComponent(p.slice(eq + 1));
    if (!REF_VALID.test(val)) return null;
    return val;
  }
  return null;
}

/**
 * Set the ref cookie on the client. First-touch only — once set, we don't
 * overwrite an existing valid cookie (the partner who brought the user in
 * gets the credit, not whoever paid for the retargeting ad).
 */
export function setRefCookieClient(ref: string): void {
  if (typeof document === "undefined") return;
  if (!REF_VALID.test(ref)) return;
  // If already set, leave it.
  if (readRefFromDocumentCookie()) return;
  const expires = new Date(
    Date.now() + REF_COOKIE_TTL_DAYS * 24 * 3600 * 1000,
  ).toUTCString();
  document.cookie = `${REF_COOKIE_NAME}=${ref}; Path=/; Expires=${expires}; SameSite=Lax`;
}
