// Tests for app/api/demo-estimate/route.ts
//
// Public endpoint, no auth, strict rate limits. We only test the
// validation + rate-limit branches — the live AI path is covered by the
// /api/estimate suite (shares lib/ai-estimate.ts).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/demo-estimate/route";

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

// /api/demo-estimate counts every call via recordAiCall().
beforeEach(() => {
  fetchMock.mockReset();
  process.env.OPENROUTER_API_KEY = "sk-test-abc";
  delete process.env.CALORA_MODEL;
});

function ipRequest(body: unknown, ip: string): NextRequest {
  return new NextRequest("http://localhost/api/demo-estimate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/demo-estimate — input validation", () => {
  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/demo-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects image uploads (sent to /sign-up instead)", async () => {
    const res = await POST(
      ipRequest(
        { text: "x", image: "data:image/png;base64,iVBORw0KGgo=" },
        "1.1.1.1",
      ),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; cta?: { href: string } };
    expect(json.error).toMatch(/photo/i);
    expect(json.cta?.href).toBe("/sign-up");
  });

  it("rejects empty text", async () => {
    const res = await POST(ipRequest({ text: "" }, "1.1.1.2"));
    expect(res.status).toBe(400);
  });

  it("rejects too-short text", async () => {
    const res = await POST(ipRequest({ text: "x" }, "1.1.1.3"));
    expect(res.status).toBe(400);
  });

  it("rejects text over 600 chars", async () => {
    const res = await POST(
      ipRequest({ text: "a".repeat(601) }, "1.1.1.4"),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/demo-estimate", () => {
  it("returns 405 with usage hint", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/POST/i);
  });
});

describe("POST /api/demo-estimate — rate limit (per-minute)", () => {
  it("returns 429 once per-minute limit is exhausted", async () => {
    // Mock the AI success for the first 3 calls.
    for (let i = 0; i < 3; i++) {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    items: [
                      {
                        name: "x",
                        calories: 1,
                        protein_g: 0,
                        carbs_g: 0,
                        fat_g: 0,
                      },
                    ],
                    totals: { calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
                    confidence: "low",
                    notes: "",
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    const ip = "9.9.9.9";
    for (let i = 0; i < 3; i++) {
      const res = await POST(ipRequest({ text: "scrambled eggs" }, ip));
      expect(res.status).toBe(200);
    }
    // 4th call should be rate-limited.
    const fourth = await POST(ipRequest({ text: "scrambled eggs" }, ip));
    expect(fourth.status).toBe(429);
    const json = (await fourth.json()) as { error: string; cta?: { href: string } };
    expect(json.error).toMatch(/rate limit|quota|sign up/i);
    expect(json.cta?.href).toBe("/sign-up");
  });
});