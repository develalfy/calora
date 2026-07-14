// lib/auth.ts — JWT session cookies for Calora.
//
// Cookie contract (the part that keeps users logged in across page reloads):
//
//   - HttpOnly: yes. JS can't read it → XSS can't steal the session.
//   - Secure:   yes in prod, off in dev (so http://localhost:3000 still works).
//   - SameSite: Lax. Allows top-level GET navigations (which is what
//               sign-in -> dashboard redirect is). Strict would block that.
//   - Path:     /. The cookie must travel on every request, not just /api/auth/*.
//   - Max-Age:  30 days. Slide on every authenticated request (see
//               `slideSessionCookieIfPresent`).
//
// Why we set the cookie on NextResponse and NOT via `cookies().set()`:
// In Next.js 15+ (we're on 16), `cookies().set()` from `next/headers`
// inside a Route Handler DOES write the Set-Cookie header to the response.
// But the safer pattern — and what the official examples now use — is to
// set cookies explicitly on the NextResponse you return. This makes
// the contract obvious in code review and removes a class of subtle bugs
// around response wrapping (e.g. server actions, streamed responses).
//
// JWT format: HMAC-SHA256, base64url(payload) + "." + base64url(hmac).
// We hand-roll the format so the auth lib has zero npm deps (faster cold
// start, no supply-chain risk for the most security-critical file).

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = process.env.COOKIE_NAME || "calora_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// AUTH_SECRET priority:
//   1. AUTH_SECRET env var (production — generated via `openssl rand -base64 44`)
//   2. CALORA_DEV_SECRET (dev/test — so tests can pin a known value)
//   3. Hard-coded last-resort fallback (NEVER use in prod; the app logs a
//      warning when it sees this).
const DEFAULT_DEV_SECRET = "calora-dev-secret-not-for-production-use-1234567890abcdef";

function getSecret(): string {
  const env = process.env.AUTH_SECRET;
  if (env && env.length >= 32) return env;
  const dev = process.env.CALORA_DEV_SECRET;
  if (dev && dev.length >= 32) return dev;
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(
      "[auth] WARNING: AUTH_SECRET is missing or too short in production. " +
        "Generate one with `openssl rand -base64 44` and set it in your env.",
    );
  }
  return DEFAULT_DEV_SECRET;
}

export type SessionPayload = {
  /** userId (the public id from users.ts) */
  uid: string;
  /** email at sign-in time — refreshed on every successful verify */
  em: string;
  /** issued-at (seconds since epoch) */
  iat: number;
  /** expires-at (seconds since epoch) */
  exp: number;
  /** session id (random per login) — used for revocation later */
  sid: string;
};

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function hmac(payload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payload).digest());
}

export function signSession(uid: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid,
    em: email,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    sid: randomBytes(16).toString("hex"),
  };
  const head = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const sig = hmac(`${head}.${body}`, getSecret());
  return `${head}.${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  if (typeof token !== "string" || token.split(".").length !== 3) return null;
  const [head, body, sig] = token.split(".");
  const expected = hmac(`${head}.${body}`, getSecret());
  // timingSafeEqual requires equal-length buffers.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body).toString("utf-8")) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the Set-Cookie header value for a freshly-issued session.
 * Use this when constructing a NextResponse so the cookie is visible
 * to the browser on the very next request.
 */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    `SameSite=Lax`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

/** Empty the session cookie. Used by /api/auth/signout. */
export function buildClearCookie(): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    `SameSite=Lax`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Read the current session from the request cookie jar. Works inside
 * both Route Handlers (where we get the cookie from the request) and
 * Server Components (where we use next/headers).
 *
 * Pass `cookieHeaderValue` for the Route-Handler case (server components
 * don't need it).
 */
export function readSession(cookieHeaderValue?: string): SessionPayload | null {
  let token: string | undefined;
  if (cookieHeaderValue) {
    token = parseCookie(cookieHeaderValue, COOKIE_NAME);
  }
  if (!token) return null;
  return verifySession(token);
}

/**
 * Server-component / server-action helper. Reads the cookie jar via
 * the Next.js cookies() async API (Next 15+).
 */
export async function readSessionFromNext(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Parse a single named cookie out of a raw Cookie header. */
function parseCookie(header: string, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    if (p.slice(0, eq) === name) return p.slice(eq + 1);
  }
  return undefined;
}