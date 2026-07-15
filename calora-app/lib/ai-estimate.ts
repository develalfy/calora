// lib/ai-estimate.ts
// Provider-specific AI estimate logic, factored out of /api/estimate so it
// can be reused by:
//   - /api/estimate          (auth-gated, full-feature, server-side account count)
//   - /api/demo-estimate     (public top-of-funnel, strict rate-limit, no auth)
//
// What lives here:
//   - The provider model constants (M3 + M27 fallback chain)
//   - The prompt template
//   - The JSON extraction (model reasoning can leak  blocks)
//   - The actual run with AbortController + timeout
//
// What is NOT here:
//   - Rate limit policy (per-route, kept close to the route so it is auditable)
//   - Auth gate (per-route)
//   - Analytics (per-route so we can attribute to user vs anon)

import type { EstimateRequest, EstimateResponse } from "@/lib/types";

export const M3 = "minimax/minimax-m3";
export const M27 = "minimax/minimax-m2.7";

export const UPSTREAM_TIMEOUT_MS = 45_000;

export const ESTIMATE_PROMPT =
  "Return ONLY valid JSON (no markdown, no preamble, no trailing text, no  tags). " +
  'Schema: {"items":[{"name":"<item>","calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>}],' +
  '"totals":{"calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>},' +
  '"confidence":"high"|"medium"|"low","notes":"<one line>"} ' +
  "USDA portion sizes. Round calories to nearest 5. If uncertain, lower confidence. Break out each item separately. " +
  "Meal: ";

export function buildPrompt(meal: string): string {
  return ESTIMATE_PROMPT + meal + ".";
}

/**
 * Reasoning models bleed their thinking into the response. Extract the JSON robustly:
 *   1. Strip any text after the LAST  tag (reasoning tail may include JSON-in-prose).
 *   2. Strip ``` ... ``` fences if present.
 *   3. Walk from the first { to find the matching balanced }.
 * We do NOT strip leading  blocks because some M3 responses put the JSON BEFORE
 * the closing tag and some AFTER — handling only the suffix is the safe bet.
 */
function extractJson(raw: string): string {
  let s: string = raw;
  const thinkEnd = s.lastIndexOf("<\/think>");
  if (thinkEnd >= 0) s = s.slice(thinkEnd + "<\/think>".length);

  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const start = s.indexOf("{");
  if (start < 0) return s.trim();
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

export interface EstimateRunResult {
  ok: true;
  data: EstimateResponse & { _meta: { latency_ms: number; model: string } };
}
export interface EstimateRunFailure {
  ok: false;
  status: number;
  error: string;
  detail?: string;
}

/**
 * Run the AI estimate with provider config. Caller is responsible for auth,
 * rate limiting, body-size validation, analytics attribution. We do NOT
 * call recordAiCall here — the caller wires that to the right metric.
 */
export async function runEstimate(
  req: EstimateRequest,
  opts: { lockedModel?: string } = {},
): Promise<EstimateRunResult | EstimateRunFailure> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: "Server misconfigured: OPENROUTER_API_KEY missing",
    };
  }

  const models = opts.lockedModel
    ? [opts.lockedModel]
    : process.env.CALORA_MODEL
      ? [process.env.CALORA_MODEL]
      : req.image
        ? [M3]
        : [M3, M27];

  const meal = req.context?.meal ?? "meal";

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: buildPrompt(meal),
    },
  ];
  if (req.text) {
    userContent.push({ type: "text", text: `Food description: ${req.text}` });
  }
  if (req.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: req.image },
    });
  }

  const t0 = Date.now();
  let lastErr = "";
  let lastStatus: number | null = null;
  let lastBody = "";

  for (const m of models) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const orRes = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
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
        },
      );
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
        return {
          ok: true,
          data: {
            ...parsed,
            _meta: { latency_ms: Date.now() - t0, model: m },
          },
        };
      }

      lastStatus = orRes.status;
      lastBody = await orRes.text();
      lastErr = `AI provider ${orRes.status} (model=${m})`;
      if (orRes.status === 400 || orRes.status === 401 || orRes.status === 403) {
        break;
      }
      console.warn(
        `Model ${m} failed ${orRes.status}, falling through to next`,
      );
    } catch (e) {
      clearTimeout(timer);
      const err = e as Error;
      if (err.name === "AbortError") {
        lastErr = `timeout after ${UPSTREAM_TIMEOUT_MS}ms (model=${m})`;
        lastStatus = 504;
        console.warn(
          `Model ${m} timed out, ${models.length > 1 ? "falling through" : "failing"}`,
        );
      } else {
        lastErr = `Network error (model=${m}): ${err.message}`;
      }
    }
  }

  console.error("All models failed:", lastErr, lastBody.slice(0, 500));
  return {
    ok: false,
    status: lastStatus ?? 502,
    error: lastErr || "AI provider error",
    detail: lastBody.slice(0, 500),
  };
}

/**
 * Validate an image data URL the same way /api/estimate does, so the demo
 * route shares the parser without importing private symbols.
 */
export function validateImageDataUrl(
  s: unknown,
): { ok: true } | { ok: false; reason: string } {
  if (typeof s !== "string")
    return { ok: false, reason: "image must be a string" };
  if (s.length === 0) return { ok: false, reason: "image is empty" };
  const lower = s.slice(0, 32).toLowerCase();
  if (!lower.startsWith("data:")) {
    return { ok: false, reason: "image must be a data: URL" };
  }
  const allowed = [
    "data:image/jpeg",
    "data:image/jpg",
    "data:image/png",
    "data:image/webp",
    "data:image/heic",
    "data:image/heif",
  ];
  if (!allowed.some((p) => lower.startsWith(p))) {
    return {
      ok: false,
      reason: "unsupported image format (allowed: jpeg, png, webp, heic)",
    };
  }
  const comma = s.indexOf(",");
  if (comma < 0) return { ok: false, reason: "malformed data URL" };
  const b64 = s.slice(comma + 1);
  const MAX_BODY_BYTES = 8 * 1024 * 1024;
  if (b64.length > MAX_BODY_BYTES * 1.5) {
    return { ok: false, reason: "image too large (max 8MB)" };
  }
  return { ok: true };
}
