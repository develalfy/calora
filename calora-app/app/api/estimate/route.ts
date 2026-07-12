// POST /api/estimate
// Accepts image OR text, returns structured calorie/macro estimate.

import { NextRequest, NextResponse } from "next/server";
import type { EstimateRequest, EstimateResponse } from "@/lib/types";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120; // seconds — covers 3 retry attempts

// Per-IP rate limits. These protect the OpenRouter budget from abuse.
// Authenticated users will have higher limits (post-MVP).
const FREE_TIER_RPM = 10; // 10 requests/min per IP — covers normal usage + retries
const FREE_TIER_RPH = 100; // 100 requests/hour per IP — hard ceiling on scraping

const PROMPT = `Return ONLY valid JSON (no markdown, no preamble, no trailing text). Schema:
{"items":[{"name":"<item>","calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>}],"totals":{"calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>},"confidence":"high"|"medium"|"low","notes":"<one line>"}
USDA portion sizes. Round calories to nearest 5. If uncertain, lower confidence. Break out each item separately. Meal: {meal}.`;

// Reasoning models (e.g. minimax/minimax-m3) bleed their thinking into the response and rarely close
// their <think>... block before the JSON. Extract the JSON robustly: skip any leading prose, then
// parse from the first balanced { ... } block.
function extractJson(text: string): string {
  // Strip any `` ... `` fence if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the first { and walk forward to find the matching close brace
  const start = text.indexOf("{");
  if (start < 0) return text.trim();
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

export async function POST(req: NextRequest) {
  // ─── Rate limit gate ─────────────────────────────────────────────────────
  const ip = clientKey(req as unknown as { headers: Headers; ip?: string });
  const minute = rateLimit(`estimate:${ip}:m`, {
    limit: FREE_TIER_RPM,
    windowMs: 60_000,
  });
  if (!minute.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded — try again in a minute.",
        retry_after_sec: minute.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(minute.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  const hour = rateLimit(`estimate:${ip}:h`, {
    limit: FREE_TIER_RPH,
    windowMs: 3_600_000,
  });
  if (!hour.allowed) {
    return NextResponse.json(
      { error: "Hourly quota exceeded — try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(hour.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: EstimateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.image && !body.text) {
    return NextResponse.json({ error: "Provide image or text" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: OPENROUTER_API_KEY missing" },
      { status: 500 },
    );
  }

  function pickModel(req: NextRequest): string[] {
    if (process.env.CALORA_MODEL) return [process.env.CALORA_MODEL];
    const requested = req.nextUrl.searchParams.get("model");
    // Default chain: Gemini 2.5 Flash (~1.5s, JSON-clean, cheapest), with fallbacks if 402/429 from provider.
    // Opt-ins:
    //   ?model=minimax → minimax/minimax-m3 (reasoning, ~10s, more accurate for ambiguous foods)
    //   ?model=sonnet  → anthropic/claude-sonnet-4 (most accurate, $$$)
    //   ?model=haiku   → anthropic/claude-3-haiku
    if (requested === "sonnet") return ["anthropic/claude-sonnet-4"];
    if (requested === "haiku") return ["anthropic/claude-3-haiku"];
    if (requested === "minimax") return ["minimax/minimax-m3"];
    // Default fallback chain (tried in order on 402/5xx)
    return [
      process.env.CALORA_DEFAULT_MODEL ?? "google/gemini-2.5-flash",
      "minimax/minimax-m3",
    ];
  }
  const models = pickModel(req);
  const model = models[0]; // for logging (_meta echo)

  const meal = body.context?.meal ?? "meal";

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: PROMPT.replace("{meal}", meal),
    },
  ];

  if (body.text) {
    userContent.push({ type: "text", text: `Food description: ${body.text}` });
  }
  if (body.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: body.image },
    });
  }

  const t0 = Date.now();
  // Try each model in order; on 402/429/5xx from the provider, fall through to the next.
  // For opt-ins (single model), only one entry is tried — fails if it's down.
  let lastErr = "";
  let lastStatus: number | null = null;
  let lastBody = "";
  for (const m of models) {
    try {
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://calora.develalfy.me",
          "X-Title": "Calora",
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "user", content: userContent }],
          max_tokens: 1200,
          temperature: 0.2,
        }),
      });
      if (orRes.ok) {
        const data = await orRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastErr = "empty content";
          lastStatus = orRes.status;
          continue;
        }
        // Parse JSON safely below; pass the parsed object forward
        const cleaned = extractJson(content);
        let parsed: EstimateResponse;
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          lastErr = `JSON parse (model=${m}): ${(e as Error).message}`;
          lastStatus = 502;
          lastBody = cleaned.slice(0, 500);
          // Try next model in chain
          continue;
        }
        if (!parsed.items || !parsed.totals) {
          lastErr = `Missing fields (model=${m})`;
          lastStatus = 502;
          lastBody = JSON.stringify(parsed).slice(0, 500);
          continue;
        }
        return NextResponse.json({
          ...parsed,
          _meta: { latency_ms: Date.now() - t0, model: m },
        });
      }
      // Non-OK: record and try next model unless it's a 4xx that's clearly ours (400/401/403)
      lastStatus = orRes.status;
      lastBody = await orRes.text();
      lastErr = `AI provider ${orRes.status} (model=${m})`;
      if (orRes.status === 400 || orRes.status === 401 || orRes.status === 403) {
        // Don't fall through for client errors
        break;
      }
      // 402/429/5xx → continue to next model
      console.warn(`Model ${m} failed ${orRes.status}, falling through to next`);
    } catch (e) {
      lastErr = `Network error (model=${m}): ${(e as Error).message}`;
    }
  }

  console.error("All models failed:", lastErr, lastBody.slice(0, 500));
  return NextResponse.json(
    {
      error: lastErr || "AI provider error",
      detail: lastBody.slice(0, 500),
    },
    { status: lastStatus ?? 502 },
  );
}