// POST /api/estimate
// Accepts image OR text, returns structured calorie/macro estimate.
//
// Provider policy (2026-07-13): only MiniMax models are permitted.
//   - minimax/minimax-m3  — multimodal (text+image+video → text), reasoning. Default.
//   - minimax/minimax-m2.7 — text-only, faster, non-multimodal. Fallback for text requests.
// Image requests fall back to M3 itself (M2.7 can't see images).
//
// Latency targets: M3 text ≈ 5-15s, M3 image ≈ 10-30s. Cloudflare free proxy times out at 100s;
// we cap server work at 90s and return 504 fast so the client can retry rather than hanging.

import { NextRequest, NextResponse } from "next/server";
import type { EstimateRequest, EstimateResponse } from "@/lib/types";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { readSession } from "@/lib/auth";
import { recordAiCall } from "@/app/api/metrics/route";

export const runtime = "nodejs";
// 90s server budget — one M3 retry (45s × 2). Cloudflare free proxy 524s at 100s so stay under.
export const maxDuration = 90;

// Per-IP rate limits. Protect the OpenRouter budget from abuse.
const FREE_TIER_RPM = 10;  // requests/min per IP — covers normal usage + retries
const FREE_TIER_RPH = 100; // requests/hour per IP — hard ceiling on scraping

// Hard body-size limit on the route — protect against absurdly large image
// payloads and accidental DoS. The Next.js client compressor caps images at
// ~500KB so 8MB gives us a 16× safety margin.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

// Image MIME validation. We allow JPEG / PNG / WEBP / HEIC. Other types —
// especially HTML, SVG (XSS via inline scripts), executables — are rejected
// before they ever reach the AI provider.
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
      reason:
        "unsupported image format (allowed: jpeg, png, webp, heic)",
    };
  }
  // Decode the base64 portion and bound the decoded size.
  // base64 is ~4/3 the size of the decoded bytes.
  const comma = s.indexOf(",");
  if (comma < 0) return { ok: false, reason: "malformed data URL" };
  const b64 = s.slice(comma + 1);
  // Cheap upper bound: assume the entire rest is base64 → ~75% of string length.
  if (b64.length > MAX_BODY_BYTES * 1.5) {
    return { ok: false, reason: "image too large (max 8MB)" };
  }
  return { ok: true };
}

// The only models this app is allowed to call.
const M3 = "minimax/minimax-m3";
const M27 = "minimax/minimax-m2.7";

// Per-model upstream timeout. We use AbortController on the upstream fetch so a stuck M3
// request fails fast instead of dragging the whole route toward Cloudflare's 100s ceiling.
const UPSTREAM_TIMEOUT_MS = 45_000;

const PROMPT = `Return ONLY valid JSON (no markdown, no preamble, no trailing text, no <think> tags).
Schema:
{"items":[{"name":"<item>","calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>}],
"totals":{"calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>},
"confidence":"high"|"medium"|"low","notes":"<one line>"}
USDA portion sizes. Round calories to nearest 5. If uncertain, lower confidence. Break out each item separately.
Meal: {meal}.`;

// Reasoning models bleed their thinking into the response. Extract the JSON robustly:
//   1. Strip any text after the LAST </think> tag (reasoning tail may include JSON-in-prose).
//   2. Strip ``` ``` fences if present.
//   3. Walk from the first { to find the matching balanced }.
// We do NOT strip leading <think>…<think> blocks because some M3 responses put the JSON BEFORE
// the closing tag and some AFTER — handling only the suffix is the safe bet.
function extractJson(raw: string): string {
  // 1. Drop everything up to and including the last </think> if present.
  let s: string = raw;
  const thinkEnd = s.lastIndexOf("</think>");
  if (thinkEnd >= 0) s = s.slice(thinkEnd + "</think>".length);

  // 2. Strip ``` ... ``` fence if present.
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // 3. Find first { and walk forward to balanced }.
  const start = s.indexOf("{");
  if (start < 0) return s.trim();
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
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

  // ─── Auth gate ───────────────────────────────────────────────────────────
  // Estimate is the only route that costs us real money (M3 multimodal tokens).
  // Anon traffic is blocked before body parsing so we don't waste cycles on
  // payloads we'll never process. The client mirrors this — see app/app/page.tsx.
  const session = readSession(req.headers.get("cookie") ?? undefined);
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required to estimate calories." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Enforce hard request-size limit before parsing the body.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large (max 8MB)" },
      { status: 413 },
    );
  }

  let body: EstimateRequest;
  try {
    // Pass a hard size cap to req.json() so a giant body still aborts cleanly.
    body = (await req.json()) as EstimateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.image && !body.text) {
    return NextResponse.json({ error: "Provide image or text" }, { status: 400 });
  }

  // Server-side image MIME validation. Defense in depth — the client also
  // compresses, but never trust the client.
  if (body.image) {
    const v = validateImageDataUrl(body.image);
    if (!v.ok) {
      return NextResponse.json(
        { error: `Invalid image: ${v.reason}` },
        { status: 400 },
      );
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: OPENROUTER_API_KEY missing" },
      { status: 500 },
    );
  }

  // Build the model chain for this request.
  //   - Image request → M3 only (M2.7 is text-only, can't see images).
  //   - Text request  → M3 first, fall back to M2.7 on hard failure (5xx/timeout/429).
  // CALORA_MODEL env var can force a single model (for testing).
  function pickModel(req: NextRequest): string[] {
    if (process.env.CALORA_MODEL) return [process.env.CALORA_MODEL];
    if (body.image) return [M3];
    return [M3, M27];
  }
  const models = pickModel(req);

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
  let lastErr = "";
  let lastStatus: number | null = null;
  let lastBody = "";

  for (const m of models) {
    // AbortController so a stuck upstream can't drag us past 45s.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
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
        signal: ac.signal,
      });
      clearTimeout(timer);

      if (orRes.ok) {
        const data = await orRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastErr = "empty content";
          lastStatus = orRes.status;
          continue;
        }
        const cleaned = extractJson(content);
        let parsed: EstimateResponse;
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          lastErr = `JSON parse (model=${m}): ${(e as Error).message}`;
          lastStatus = 502;
          lastBody = cleaned.slice(0, 500);
          continue;
        }
        if (!parsed.items || !parsed.totals) {
          lastErr = `Missing fields (model=${m})`;
          lastStatus = 502;
          lastBody = JSON.stringify(parsed).slice(0, 500);
          continue;
        }
        const latencyMs = Date.now() - t0;
        recordAiCall({ ok: true, latencyMs });
        return NextResponse.json({
          ...parsed,
          _meta: { latency_ms: latencyMs, model: m },
        });
      }

      // Non-OK upstream: record and fall through unless it's a client-side 4xx (our fault).
      lastStatus = orRes.status;
      lastBody = await orRes.text();
      lastErr = `AI provider ${orRes.status} (model=${m})`;
      if (orRes.status === 400 || orRes.status === 401 || orRes.status === 403) {
        break;
      }
      console.warn(`Model ${m} failed ${orRes.status}, falling through to next`);
    } catch (e) {
      clearTimeout(timer);
      const err = e as Error;
      if (err.name === "AbortError") {
        lastErr = `timeout after ${UPSTREAM_TIMEOUT_MS}ms (model=${m})`;
        lastStatus = 504;
        console.warn(`Model ${m} timed out, ${models.length > 1 ? "falling through" : "failing"}`);
      } else {
        lastErr = `Network error (model=${m}): ${err.message}`;
      }
    }
  }

  console.error("All models failed:", lastErr, lastBody.slice(0, 500));
  recordAiCall({ ok: false, latencyMs: Date.now() - t0 });
  return NextResponse.json(
    {
      error: lastErr || "AI provider error",
      detail: lastBody.slice(0, 500),
    },
    { status: lastStatus ?? 502 },
  );
}