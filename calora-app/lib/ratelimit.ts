// In-process rate limiter — used by /api/estimate to prevent budget burn.
// Production note: this is a per-process limit. With multiple replicas,
// each replica enforces independently. For SaaS, swap this out for an
// Upstash/Redis-backed limiter once you need strict cross-replica limits.

interface Bucket {
  // timestamps (ms) of recent hits, oldest first
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Max hits in the rolling window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number; // ms until oldest hit expires
  retryAfterSec: number; // for `Retry-After` header
}

/**
 * Check + record a hit for `key` against the rate limit.
 * Returns whether the hit is allowed and how many remain in the window.
 */
export function rateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const cutoff = now - cfg.windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  // Drop expired hits
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) {
    bucket.hits.shift();
  }
  if (bucket.hits.length >= cfg.limit) {
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + cfg.windowMs - now,
      retryAfterSec: Math.ceil((oldest + cfg.windowMs - now) / 1000),
    };
  }
  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: cfg.limit - bucket.hits.length,
    resetMs: cfg.windowMs,
    retryAfterSec: 0,
  };
}

/** Extract a stable per-caller key from a NextRequest. */
export function clientKey(req: { headers: Headers; ip?: string }): string {
  // Prefer x-forwarded-for if present (behind a proxy)
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  if (req.ip) return req.ip;
  // Fall back to a global default (test mode, no headers)
  return "unknown";
}

/** Periodic cleanup so the bucket Map doesn't grow unboundedly. */
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
export function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      // Drop buckets where every hit has expired (> 1h since last hit)
      const last = b.hits[b.hits.length - 1] ?? 0;
      if (last < now - 3_600_000) buckets.delete(k);
    }
  }, CLEANUP_INTERVAL_MS);
}