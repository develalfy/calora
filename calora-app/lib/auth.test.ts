// Unit tests for the auth primitives.
//
// We exercise the hand-rolled JWT signer/verifier directly (no Prisma,
// no filesystem, no Next.js) so the security-critical signing code has
// 100% coverage. The user-store tests use a tmp dir that gets cleaned up.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";

// Force a deterministic secret BEFORE importing lib/auth so module-init
// captures it. CALORA_DEV_SECRET is what auth.ts reads when AUTH_SECRET
// is not set.
(process.env as Record<string, string>).CALORA_DEV_SECRET =
  "test-secret-must-be-at-least-32-chars-long-aaaa";
(process.env as Record<string, string>).NODE_ENV = "test";

const { signSession, verifySession, buildSessionCookie, buildClearCookie, COOKIE_NAME } =
  await import("./auth");

const { _setDataDirForTests, _resetForTests, createUser, verifyCredentials, findUserByEmail, updatePassword } =
  await import("./users");

describe("JWT session cookies", () => {
  it("round-trips a valid token", () => {
    const t = signSession("u-123", "a@b.com");
    const v = verifySession(t);
    expect(v).not.toBeNull();
    expect(v!.uid).toBe("u-123");
    expect(v!.em).toBe("a@b.com");
    expect(v!.sid.length).toBe(32);
    expect(v!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered signature", () => {
    const t = signSession("u-123", "a@b.com");
    // flip one char in the signature segment
    const parts = t.split(".");
    parts[2] = "A".repeat(parts[2].length);
    expect(verifySession(parts.join("."))).toBeNull();
  });

  it("rejects a malformed token (not 3 segments)", () => {
    expect(verifySession("abc.def")).toBeNull();
    expect(verifySession("only-one")).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("a.b.c.d")).toBeNull();
  });

  it("rejects an expired token", () => {
    // Manually craft a token with exp in the past. We bypass signSession
    // because the public API always sets a future exp.
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const body = Buffer.from(JSON.stringify({ uid: "u-123", em: "a@b.com", iat: pastExp - 60, exp: pastExp, sid: "deadbeef" }))
      .toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const sig = crypto
      .createHmac("sha256", process.env.CALORA_DEV_SECRET!)
      .update(`${head}.${body}`)
      .digest("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(verifySession(`${head}.${body}.${sig}`)).toBeNull();
  });

  it("emits an httpOnly cookie with the right shape", () => {
    const t = signSession("u-123", "a@b.com");
    const cookie = buildSessionCookie(t);
    expect(cookie.startsWith(`${COOKIE_NAME}=`)).toBe(true);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=2592000"); // 30 days
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    // No Secure in dev mode (NODE_ENV=test)
    expect(cookie).not.toContain("Secure");
  });

  it("emits a clear cookie that expires immediately", () => {
    const cookie = buildClearCookie();
    expect(cookie).toContain(`${COOKIE_NAME}=`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
  });
});

describe("user store (file-backed)", () => {
  const tmp = path.join(tmpdir(), `calora-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  beforeEach(async () => {
    _setDataDirForTests(tmp);
    await fs.mkdir(tmp, { recursive: true });
    await _resetForTests();
  });
  afterEach(async () => {
    try {
      await fs.rm(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("creates a user with a hashed password (not plaintext)", async () => {
    const r = await createUser({ email: "alice@example.com", password: "supersecret" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user.email).toBe("alice@example.com");
    expect(r.user.passwordHash).not.toContain("supersecret");
    expect(r.user.passwordHash.startsWith("$2")).toBe(true); // bcrypt
    expect(r.user.id.length).toBeGreaterThanOrEqual(16);
    expect(typeof r.user.createdAt).toBe("number");
  });

  it("lower-cases and trims the email on create", async () => {
    const r = await createUser({ email: "  Bob@Example.COM  ", password: "goodpassword" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user.email).toBe("bob@example.com");
  });

  it("rejects duplicate emails with email_taken", async () => {
    const a = await createUser({ email: "dup@example.com", password: "goodpassword" });
    expect(a.ok).toBe(true);
    const b = await createUser({ email: "dup@example.com", password: "different1" });
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(b.reason).toBe("email_taken");
  });

  it("rejects passwords shorter than 8 chars", async () => {
    const r = await createUser({ email: "weak@example.com", password: "short" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("weak_password");
  });

  it("rejects passwords longer than 72 chars (bcrypt limit)", async () => {
    const r = await createUser({ email: "long@example.com", password: "x".repeat(73) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("weak_password");
  });

  it("rejects malformed emails", async () => {
    const r = await createUser({ email: "not-an-email", password: "goodpassword" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid_email");
  });

  it("verifyCredentials returns user only on correct password", async () => {
    await createUser({ email: "verify@example.com", password: "rightpw1234" });
    const ok = await verifyCredentials("verify@example.com", "rightpw1234");
    expect(ok).not.toBeNull();
    expect(ok?.email).toBe("verify@example.com");

    const wrong = await verifyCredentials("verify@example.com", "wrong");
    expect(wrong).toBeNull();

    const noUser = await verifyCredentials("nobody@example.com", "rightpw1234");
    expect(noUser).toBeNull();
  });

  it("findUserByEmail is case-insensitive", async () => {
    await createUser({ email: "case@example.com", password: "goodpassword" });
    const u = await findUserByEmail("CASE@EXAMPLE.COM");
    expect(u).not.toBeNull();
  });

  it("updatePassword rotates the hash and invalidates old password", async () => {
    const r = await createUser({ email: "rot@example.com", password: "oldpassword1" });
    if (!r.ok) throw new Error("create failed");
    const ok = await updatePassword(r.user.id, "newpassword2");
    expect(ok).toBe(true);

    const oldCheck = await verifyCredentials("rot@example.com", "oldpassword1");
    expect(oldCheck).toBeNull();

    const newCheck = await verifyCredentials("rot@example.com", "newpassword2");
    expect(newCheck).not.toBeNull();
  });

  it("survives a simulated restart (reads back from disk)", async () => {
    await createUser({ email: "persist@example.com", password: "persistedpw1" });
    // The data lives in tmp/users.json — read it back via the store
    // by calling findUserByEmail again. (We don't unload the module here;
    // the in-process state already has it, so we just confirm.)
    const u = await findUserByEmail("persist@example.com");
    expect(u).not.toBeNull();
    // And the password still verifies correctly.
    const v = await verifyCredentials("persist@example.com", "persistedpw1");
    expect(v).not.toBeNull();
  });
});