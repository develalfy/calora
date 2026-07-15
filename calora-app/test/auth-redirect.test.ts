// Tests for lib/auth-redirect.ts — the cross-link helpers used in the
// Sign-in <-> Sign-up headers. Regression test for the QA finding that
// the cross-link dropped ?next= context.

import { describe, it, expect } from "vitest";
import {
  signInHrefWithNext,
  signUpHrefWithNext,
  safeNextPath,
} from "@/lib/auth-redirect";

describe("safeNextPath — input filter", () => {
  it("accepts a simple absolute path", () => {
    expect(safeNextPath("/app")).toBe("/app");
  });
  it("accepts nested paths and query strings", () => {
    expect(safeNextPath("/app?tab=history")).toBe("/app?tab=history");
    expect(safeNextPath("/account/settings")).toBe("/account/settings");
  });
  it("returns null for empty / missing values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
  it("rejects absolute URLs (open-redirect guard)", () => {
    expect(safeNextPath("https://evil.example.com")).toBeNull();
    expect(safeNextPath("http://evil.example.com")).toBeNull();
  });
  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.example.com")).toBeNull();
    expect(safeNextPath("//evil.example.com/path")).toBeNull();
  });
  it("rejects paths that don't start with /", () => {
    expect(safeNextPath("app")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });
});

describe("signUpHrefWithNext — sign-in → sign-up cross-link", () => {
  it("preserves the next= context (the actual bug being fixed)", () => {
    expect(signUpHrefWithNext("/app")).toBe("/sign-up?next=%2Fapp");
  });
  it("URL-encodes nested paths and query strings correctly", () => {
    expect(signUpHrefWithNext("/app?tab=history")).toBe(
      "/sign-up?next=%2Fapp%3Ftab%3Dhistory",
    );
  });
  it("returns plain /sign-up when next is missing", () => {
    expect(signUpHrefWithNext(null)).toBe("/sign-up");
    expect(signUpHrefWithNext(undefined)).toBe("/sign-up");
  });
  it("falls back to /sign-up when next is unsafe", () => {
    // We don't want to encode attacker-controlled URLs into the link.
    expect(signUpHrefWithNext("https://evil.example.com")).toBe("/sign-up");
    expect(signUpHrefWithNext("//evil.example.com")).toBe("/sign-up");
  });
});

describe("signInHrefWithNext — sign-up → sign-in cross-link", () => {
  it("preserves the next= context", () => {
    expect(signInHrefWithNext("/account")).toBe("/sign-in?next=%2Faccount");
  });
  it("returns plain /sign-in when next is missing", () => {
    expect(signInHrefWithNext(null)).toBe("/sign-in");
  });
  it("falls back to /sign-in when next is unsafe", () => {
    expect(signInHrefWithNext("https://evil.example.com")).toBe("/sign-in");
  });
});

describe("end-to-end round-trip: sign-in → sign-up → sign-in", () => {
  // This is the actual user journey that was broken. Make sure the
  // round-trip preserves the next parameter through the cross-links.
  it("keeps next=/app alive through both directions", () => {
    const fromHome = "/sign-in?next=/app";
    const nextOnSignIn = new URL(`http://x${fromHome}`).searchParams.get("next");
    const signUpLink = signUpHrefWithNext(nextOnSignIn);
    expect(signUpLink).toBe("/sign-up?next=%2Fapp");

    const fromSignUp = signUpLink;
    const nextOnSignUp = new URL(`http://x${fromSignUp}`).searchParams.get("next");
    const signInLink = signInHrefWithNext(nextOnSignUp);
    expect(signInLink).toBe("/sign-in?next=%2Fapp");
  });
});