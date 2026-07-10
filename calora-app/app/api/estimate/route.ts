// POST /api/estimate
// Accepts image OR text, returns structured calorie/macro estimate.

import { NextRequest, NextResponse } from "next/server";
import type { EstimateRequest, EstimateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // seconds — covers 3 retry attempts

const PROMPT = `Return ONLY valid JSON (no markdown). Schema:
{"items":[{"name":"<item>","calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>}],"totals":{"calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>},"confidence":"high"|"medium"|"low","notes":"<one line>"}
USDA portion sizes. Round calories to nearest 5. If uncertain, lower confidence. Break out each item separately. Meal: {meal}.`;

export async function POST(req: NextRequest) {
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

  function pickModel(): string {
    if (process.env.CALORA_MODEL) return process.env.CALORA_MODEL;
    const requested = req.nextUrl.searchParams.get("model");
    if (requested === "sonnet") return "anthropic/claude-sonnet-4";
    if (requested === "haiku") return "anthropic/claude-3-haiku";
    return process.env.CALORA_DEFAULT_MODEL ?? "anthropic/claude-3-haiku";
  }
  const model = pickModel();

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
  try {
    let orRes: Response | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        // Backoff: 5s, 12s
        await new Promise((r) => setTimeout(r, attempt === 1 ? 5000 : 12000));
      }
      orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://calora.develalfy.me",
          "X-Title": "Calora",
        },
        body: JSON.stringify({
        // Model selection: env override > client param > default.
        // Sonnet is best for food vision but is more expensive.
        // Haiku is the dev/demo fallback; still works, cheaper.
        model:
          process.env.CALORA_MODEL ??
          (req.nextUrl.searchParams.get("model") === "sonnet"
            ? "anthropic/claude-sonnet-4"
            : req.nextUrl.searchParams.get("model") === "haiku"
              ? "anthropic/claude-3-haiku"
              : process.env.CALORA_DEFAULT_MODEL ?? "anthropic/claude-3-haiku"),
        messages: [{ role: "user", content: userContent }],
        max_tokens: 250,
        temperature: 0.2,
        }),
      });
      if (orRes.ok) break;
      lastErr = await orRes.text();
      // 402 = credit window or rate limit; back off and retry
      // 5xx = transient, retry
      if (orRes.status !== 402 && orRes.status < 500) break;
    }

    if (!orRes || !orRes.ok) {
      console.error("OpenRouter error", orRes?.status, lastErr.slice(0, 500));
      return NextResponse.json(
        { error: `AI provider error (${orRes?.status ?? "?"})` },
        { status: 502 },
      );
    }

    const data = await orRes.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    // Strip possible markdown fences (model occasionally wraps)
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: EstimateResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse fail:", cleaned.slice(0, 300));
      return NextResponse.json(
        { error: "AI returned malformed response", raw: cleaned.slice(0, 500) },
        { status: 502 },
      );
    }

    // Sanity check
    if (!parsed.items || !parsed.totals) {
      return NextResponse.json(
        { error: "AI response missing fields", raw: parsed },
        { status: 502 },
      );
    }

    // Pick the same model the request used (for _meta echo)
    const requestModel =
      process.env.CALORA_MODEL ??
      (req.nextUrl.searchParams.get("model") === "sonnet"
        ? "anthropic/claude-sonnet-4"
        : req.nextUrl.searchParams.get("model") === "haiku"
          ? "anthropic/claude-3-haiku"
          : process.env.CALORA_DEFAULT_MODEL ?? "anthropic/claude-3-haiku");

    return NextResponse.json({
      ...parsed,
      _meta: { latency_ms: Date.now() - t0, model: requestModel },
    });
  } catch (e) {
    console.error("Estimate route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}