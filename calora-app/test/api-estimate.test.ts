// Integration tests for app/api/estimate/route.ts
// We exercise the route handler directly by calling POST() with a NextRequest.
// The OpenRouter call is mocked so no real AI spend happens during tests.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/estimate/route";

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonRequest(body: unknown, query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/estimate${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function orSuccess(content: string, tokens = { prompt: 100, completion: 50 }) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: tokens,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function orFail(status: number, body = "error") {
  return new Response(body, { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  process.env.OPENROUTER_API_KEY = "sk-or-test-key";
  delete process.env.CALORA_MODEL;
  delete process.env.CALORA_DEFAULT_MODEL;
});

describe("POST /api/estimate — input validation", () => {
  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/estimate", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/json/i);
  });

  it("returns 400 when neither image nor text provided", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/provide/i);
  });

  it("returns 500 when API key missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await POST(jsonRequest({ text: "1 apple" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/misconfigured/i);
  });
});

describe("POST /api/estimate — happy path", () => {
  it("parses valid JSON and returns items + totals + confidence + _meta", async () => {
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        JSON.stringify({
          items: [{ name: "Apple", calories: 95, protein_g: 0, carbs_g: 25, fat_g: 0 }],
          totals: { calories: 95, protein_g: 0, carbs_g: 25, fat_g: 0 },
          confidence: "high",
          notes: "1 medium apple",
        }),
      ),
    );
    const res = await POST(jsonRequest({ text: "1 apple" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Apple");
    expect(body.confidence).toBe("high");
    expect(body._meta.latency_ms).toBeGreaterThanOrEqual(0);
    expect(body._meta.model).toBeTruthy();
  });

  it("strips markdown fences from the AI response", async () => {
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        "```json\n" +
          JSON.stringify({
            items: [{ name: "X", calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2 }],
            totals: { calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2 },
            confidence: "medium",
            notes: "",
          }) +
          "\n```",
      ),
    );
    const res = await POST(jsonRequest({ text: "x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].name).toBe("X");
  });

  it("extracts balanced JSON when reasoning model leaks prose", async () => {
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        "Let me think about this.\nThe user has 1 apple.\n" +
          JSON.stringify({
            items: [{ name: "Apple", calories: 95, protein_g: 0, carbs_g: 25, fat_g: 0 }],
            totals: { calories: 95, protein_g: 0, carbs_g: 25, fat_g: 0 },
            confidence: "high",
            notes: "ok",
          }),
      ),
    );
    const res = await POST(jsonRequest({ text: "1 apple" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/estimate — fallback chain", () => {
  it("falls through to next model on 429", async () => {
    fetchMock
      .mockResolvedValueOnce(orFail(429, "rate limited"))
      .mockResolvedValueOnce(
        orSuccess(
          JSON.stringify({
            items: [{ name: "X", calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2 }],
            totals: { calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2 },
            confidence: "low",
            notes: "fallback",
          }),
        ),
      );
    const res = await POST(jsonRequest({ text: "x" }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT fall through on 401 (auth error — ours to fix)", async () => {
    fetchMock.mockResolvedValueOnce(orFail(401, "bad key"));
    const res = await POST(jsonRequest({ text: "x" }));
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls through on 502 from the provider", async () => {
    fetchMock
      .mockResolvedValueOnce(orFail(502, "upstream down"))
      .mockResolvedValueOnce(
        orSuccess(
          JSON.stringify({
            items: [{ name: "X", calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2 }],
            totals: { calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2 },
            confidence: "low",
            notes: "",
          }),
        ),
      );
    const res = await POST(jsonRequest({ text: "x" }));
    expect(res.status).toBe(200);
  });

  it("returns upstream status when every model in the chain fails", async () => {
    fetchMock
      .mockResolvedValueOnce(orFail(500, "boom"))
      .mockResolvedValueOnce(orFail(500, "boom"));
    const res = await POST(jsonRequest({ text: "x" }));
    expect(res.status).toBeGreaterThanOrEqual(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("handles network errors gracefully", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        orSuccess(
          JSON.stringify({
            items: [{ name: "X", calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 }],
            totals: { calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
            confidence: "low",
            notes: "",
          }),
        ),
      );
    const res = await POST(jsonRequest({ text: "x" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/estimate — model selection", () => {
  it("uses CALORA_MODEL when set", async () => {
    process.env.CALORA_MODEL = "custom/model";
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        JSON.stringify({
          items: [{ name: "X", calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 }],
          totals: { calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
          confidence: "low",
          notes: "",
        }),
      ),
    );
    await POST(jsonRequest({ text: "x" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("custom/model");
  });

  it("?model=sonnet uses claude-sonnet-4", async () => {
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        JSON.stringify({
          items: [{ name: "X", calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 }],
          totals: { calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
          confidence: "low",
          notes: "",
        }),
      ),
    );
    await POST(jsonRequest({ text: "x" }, "?model=sonnet"));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("anthropic/claude-sonnet-4");
  });

  it("default chain is [gemini-2.5-flash, minimax-m3]", async () => {
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        JSON.stringify({
          items: [{ name: "X", calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 }],
          totals: { calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
          confidence: "low",
          notes: "",
        }),
      ),
    );
    await POST(jsonRequest({ text: "x" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("google/gemini-2.5-flash");
  });
});

describe("POST /api/estimate — image payload", () => {
  it("accepts a data URL image", async () => {
    fetchMock.mockResolvedValueOnce(
      orSuccess(
        JSON.stringify({
          items: [{ name: "Burger", calories: 540, protein_g: 25, carbs_g: 40, fat_g: 28 }],
          totals: { calories: 540, protein_g: 25, carbs_g: 40, fat_g: 28 },
          confidence: "high",
          notes: "approx",
        }),
      ),
    );
    const res = await POST(
      jsonRequest({ image: "data:image/jpeg;base64,/9j/4AAQ..." }),
    );
    expect(res.status).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].content).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "image_url" })]),
    );
  });
});