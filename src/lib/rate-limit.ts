import "server-only";

import { NextResponse, type NextRequest } from "next/server";

/**
 * Fixed-window, in-memory rate limiter.
 *
 * LIMITATION: state lives in this server process only. On serverless or
 * multi-instance deployments each instance has its own counters, so this must
 * be replaced with a shared store (e.g. Redis) before production. The
 * `checkRateLimit` signature is the seam for that swap.
 */

type Entry = { count: number; resetAt: number };

const MAX_TRACKED_KEYS = 10_000;
const store = new Map<string, Entry>();

export type RateLimitResult = {
  success: boolean;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    if (store.size >= MAX_TRACKED_KEYS) pruneExpired(now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count++;
  return { success: true, retryAfterSeconds: 0 };
}

function pruneExpired(now: number) {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
  // Still full (under attack): drop the oldest entries rather than grow unbounded.
  if (store.size >= MAX_TRACKED_KEYS) {
    const overflow = store.size - MAX_TRACKED_KEYS + 1;
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

/**
 * Best-effort client IP. `x-forwarded-for` is only trustworthy behind a proxy
 * that overwrites it (Vercel, a load balancer); keep that in mind when deploying.
 */
export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Auth policies: 5 attempts per minute per IP, per endpoint.
export const AUTH_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 } as const;

/**
 * Returns a 429 response when the caller is over the auth limit for `scope`,
 * or null when the request may proceed. Call before any other work.
 */
export function enforceAuthRateLimit(request: NextRequest, scope: string) {
  const { success, retryAfterSeconds } = checkRateLimit(
    `auth:${scope}:${getClientIp(request)}`,
    AUTH_RATE_LIMIT.maxRequests,
    AUTH_RATE_LIMIT.windowMs
  );

  if (success) return null;

  return NextResponse.json(
    {
      success: false,
      message: "Too many attempts. Please wait a moment and try again.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
