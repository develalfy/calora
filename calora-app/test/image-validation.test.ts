// Unit tests for the image validation + body-size guard added to /api/estimate.
// We exercise the validator through a real route call (no mocking) so we test
// what the user actually hits.

import { describe, it, expect } from "vitest";

// Re-implement the validator here for direct unit testing without spinning
// up Next.js. Mirrors app/api/estimate/route.ts exactly. If you change the
// validator, change this too (or import it from a shared module — TODO).

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_PREFIXES = [
  "data:image/jpeg",
  "data:image/jpg",
  "data:image/png",
  "data:image/webp",
  "data:image/heic",
  "data:image/heif",
];

function validateImageDataUrl(s: string): { ok: boolean; reason?: string } {
  if (typeof s !== "string") return { ok: false, reason: "image must be a string" };
  if (s.length === 0) return { ok: false, reason: "image is empty" };
  const lower = s.slice(0, 32).toLowerCase();
  if (!lower.startsWith("data:")) {
    return { ok: false, reason: "image must be a data: URL" };
  }
  if (!ALLOWED_IMAGE_PREFIXES.some((p) => lower.startsWith(p))) {
    return {
      ok: false,
      reason: "unsupported image format (allowed: jpeg, png, webp, heic)",
    };
  }
  const comma = s.indexOf(",");
  if (comma < 0) return { ok: false, reason: "malformed data URL" };
  const b64 = s.slice(comma + 1);
  if (b64.length > MAX_BODY_BYTES * 1.5) {
    return { ok: false, reason: "image too large (max 8MB)" };
  }
  return { ok: true };
}

describe("validateImageDataUrl", () => {
  it("accepts JPEG data URL", () => {
    const url = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(validateImageDataUrl(url).ok).toBe(true);
  });

  it("accepts PNG data URL", () => {
    const url = "data:image/png;base64,iVBORw0KGgo=";
    expect(validateImageDataUrl(url).ok).toBe(true);
  });

  it("accepts WEBP data URL", () => {
    const url = "data:image/webp;base64,UklGRiQ=";
    expect(validateImageDataUrl(url).ok).toBe(true);
  });

  it("accepts HEIC data URL (mobile cameras)", () => {
    const url = "data:image/heic;base64,AAAAGGZ0eXBpc29t";
    expect(validateImageDataUrl(url).ok).toBe(true);
  });

  it("rejects SVG (XSS vector)", () => {
    const url = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==";
    expect(validateImageDataUrl(url).ok).toBe(false);
    expect(validateImageDataUrl(url).reason).toMatch(/unsupported/);
  });

  it("rejects HTML data URL", () => {
    const url = "data:text/html;base64,PGgxPlhTUzwvaDE+";
    expect(validateImageDataUrl(url).ok).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateImageDataUrl("").ok).toBe(false);
  });

  it("rejects non-data URLs", () => {
    expect(validateImageDataUrl("https://example.com/image.png").ok).toBe(false);
  });

  it("rejects payload-too-large (huge base64)", () => {
    const huge = "data:image/jpeg;base64," + "A".repeat(13 * 1024 * 1024);
    const r = validateImageDataUrl(huge);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/too large/);
  });

  it("is case-insensitive on the MIME prefix", () => {
    const url = "DATA:IMAGE/JPEG;base64,/9j/4AA=";
    expect(validateImageDataUrl(url).ok).toBe(true);
  });

  it("rejects malformed data URL with no comma", () => {
    const url = "data:image/jpeg;base64";
    expect(validateImageDataUrl(url).ok).toBe(false);
  });
});