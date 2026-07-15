// lib/pending-envelope.ts
//
// Session-storage envelope shared between CaptureView, LoadingView, and
// EditView on app/app/page.tsx. Bundles the original request alongside
// the AI result so the meal-type chosen in Capture survives the round
// trip into Review.
//
// Before this existed, the two views wrote to two separate keys
// (`calora:pending-estimate` + `calora:pending-result`), and LoadingView
// cleared `pending-estimate` on success BEFORE EditView mounted. The
// race meant EditView's useEffect read null for the meal-type and
// defaulted to "lunch" — silently downgrading the user's choice.
//
// This helper gives one canonical write/read path and includes a legacy
// fallback so a stale tab from before the fix still works on its next
// attempt.

import type { EstimateResult, MealType } from "./types";

export const PENDING_KEY = "calora:pending-result";

export type PendingRequest = {
  image?: string;
  text?: string;
  meal: MealType;
};

export type PendingEnvelope = {
  request?: PendingRequest;
  result?: EstimateResult;
};

/** Build the request-side of the envelope from CaptureView's inputs. */
export function buildRequest(
  input: { image?: string; text?: string },
  meal: MealType,
): PendingRequest {
  return {
    image: input.image,
    text: input.text,
    meal,
  };
}

/** Seed the envelope at the moment the user hits Estimate. */
export function seedEnvelope(input: { image?: string; text?: string }, meal: MealType): void {
  if (typeof window === "undefined") return;
  const env: PendingEnvelope = { request: buildRequest(input, meal) };
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(env));
}

/** Merge the AI result into a previously-seeded envelope. */
export function attachResult(result: EstimateResult): void {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  let env: PendingEnvelope = {};
  if (raw) {
    try {
      env = JSON.parse(raw) as PendingEnvelope;
    } catch {
      env = {};
    }
  }
  env.result = result;
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(env));
}

/**
 * Read the envelope. Returns whatever is parseable; missing fields are
 * left undefined so callers can fall back to defaults without throwing.
 *
 * Also handles the legacy flat shape used before this helper existed
 * (`{"image":...,"text":...,"meal":...}`) so a tab opened before the
 * deploy still works for the request it's already mid-flight on.
 */
export function readEnvelope(): PendingEnvelope {
  if (typeof window === "undefined") return {};
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "request" in parsed) {
      return parsed as PendingEnvelope;
    }
    // Legacy: flat shape — treat as a request-only envelope so the
    // LoadingView still has what it needs to send the API call.
    if (parsed && typeof parsed === "object") {
      const legacy = parsed as { image?: string; text?: string; meal?: MealType };
      return { request: buildRequest({ image: legacy.image, text: legacy.text }, legacy.meal ?? "lunch") };
    }
    return {};
  } catch {
    return {};
  }
}

/** Extract just the request payload (LoadingView's API call input). */
export function readRequest(): PendingRequest | null {
  const env = readEnvelope();
  return env.request ?? null;
}

/** Extract just the AI result (EditView's primary input). */
export function readResult(): EstimateResult | null {
  const env = readEnvelope();
  return env.result ?? null;
}

/** Wipe the envelope. Called when the user navigates back to home or
 *  starts a fresh capture. */
export function clearEnvelope(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_KEY);
}