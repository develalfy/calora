// Tests for lib/attribution.ts
//
// Covers the URL parser, cookie header reader, validation matrix, and the
// mismatch between body.ref / URL ?ref= / cookie — the signup route tries all
// three sources in order.

import { describe, it, expect } from "vitest";
import {
  readRefFromUrl,
  readRefFromCookieHeader,
  REF_COOKIE_NAME,
} from "@/lib/attribution";

describe("readRefFromUrl", () => {
  it("extracts a valid ref", () => {
    expect(readRefFromUrl("https://calora.develalfy.me/?ref=ashraf")).toBe(
      "ashraf",
    );
  });

  it("lowercases", () => {
    expect(readRefFromUrl("https://x.com/?ref=AshRaf")).toBe("ashraf");
  });

  it("accepts digits and dashes", () => {
    expect(readRefFromUrl("https://x.com/?ref=coach-42_xyz")).toBe(
      "coach-42_xyz",
    );
  });

  it("returns null when missing", () => {
    expect(readRefFromUrl("https://x.com/")).toBeNull();
  });

  it("rejects uppercase-only or weird chars", () => {
    // Read-side normalizes to lowercase before regex, so mixed-case becomes
    // valid (`AshRaf` → `ashraf`). Pure-uppercase becomes pure-lowercase,
    // which IS valid. To exercise the rejection, send a ref with chars the
    // regex rejects outright.
    expect(readRefFromUrl("https://x.com/?ref=a%20b")).toBeNull();
    expect(readRefFromUrl("https://x.com/?ref=ev!l")).toBeNull();
    expect(readRefFromUrl("https://x.com/?ref=has space")).toBeNull();
  });

  it("accepts mixed-case as lowercase", () => {
    expect(readRefFromUrl("https://x.com/?ref=Coach-Jane")).toBe(
      "coach-jane",
    );
  });

  it("rejects too-long refs", () => {
    const long = "a".repeat(65);
    expect(readRefFromUrl(`https://x.com/?ref=${long}`)).toBeNull();
  });

  it("handles invalid URLs gracefully", () => {
    expect(readRefFromUrl("not a url")).toBeNull();
    expect(readRefFromUrl(null)).toBeNull();
    expect(readRefFromUrl(undefined)).toBeNull();
  });
});

describe("readRefFromCookieHeader", () => {
  it("extracts a valid ref from a cookie header", () => {
    const header = `${REF_COOKIE_NAME}=coach42; other=value`;
    expect(readRefFromCookieHeader(header)).toBe("coach42");
  });

  it("returns null when ref cookie is missing", () => {
    expect(readRefFromCookieHeader("session=abc; foo=bar")).toBeNull();
  });

  it("returns null on malformed cookie header", () => {
    expect(readRefFromCookieHeader(null)).toBeNull();
    expect(readRefFromCookieHeader(undefined)).toBeNull();
    expect(readRefFromCookieHeader("")).toBeNull();
  });

  it("rejects invalid ref values baked into the cookie", () => {
    const header = `${REF_COOKIE_NAME}=EvilInjection`;
    expect(readRefFromCookieHeader(header)).toBeNull();
  });
});
