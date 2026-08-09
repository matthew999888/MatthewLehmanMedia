// Fixed-window rate limiting, backed by the consume_rate_limit() function in
// db/001_schema.sql. One atomic upsert per call — no Redis, no extra vendor.

import { adminClient } from './supabase.js';
import { clientIp } from './env.js';
import { fail } from './http.js';

// Named budgets, so limits live in one place instead of scattered through the
// routes. { limit, windowSeconds }
export const LIMITS = {
  signup:        { limit: 5,   windowSeconds: 3600 },   // 5/hour per IP
  signupEmail:   { limit: 3,   windowSeconds: 86400 },  // 3/day per email
  resendConfirm: { limit: 3,   windowSeconds: 3600 },
  passwordReset: { limit: 5,   windowSeconds: 3600 },
  secretLink:    { limit: 60,  windowSeconds: 300 },    // guess-resistance
  download:      { limit: 300, windowSeconds: 3600 },
  contact:       { limit: 5,   windowSeconds: 3600 },
  sendLink:      { limit: 100, windowSeconds: 3600 },   // admin emailing clients
  adminWrite:    { limit: 600, windowSeconds: 3600 },
};

/**
 * Spend one token. Returns { allowed, remaining, resetAt }.
 *
 * Fails OPEN when the database is unreachable: a rate limiter that takes the
 * site down when Postgres hiccups is worse than the abuse it prevents. The
 * Turnstile check in front of the sensitive routes is the real gate.
 */
export async function consume(bucket, identifier) {
  const budget = LIMITS[bucket];
  if (!budget) throw new Error(`Unknown rate limit bucket: ${bucket}`);

  const key = `${bucket}:${identifier}`;
  try {
    const { data, error } = await adminClient().rpc('consume_rate_limit', {
      p_key: key,
      p_limit: budget.limit,
      p_window_seconds: budget.windowSeconds,
    });
    if (error) {
      console.error('[ratelimit] rpc failed, failing open:', error.message);
      return { allowed: true, remaining: budget.limit, resetAt: null };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: Boolean(row?.allowed),
      remaining: row?.remaining ?? 0,
      resetAt: row?.reset_at ?? null,
    };
  } catch (err) {
    console.error('[ratelimit] unavailable, failing open:', err.message);
    return { allowed: true, remaining: budget.limit, resetAt: null };
  }
}

/**
 * Spend a token for this request's IP and answer with 429 if exhausted.
 * Returns true when the caller may proceed.
 */
export async function enforce(req, res, bucket, identifier) {
  const id = identifier || clientIp(req);
  const result = await consume(bucket, id);

  const budget = LIMITS[bucket];
  res.setHeader('X-RateLimit-Limit', String(budget.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    const retryAfter = result.resetAt
      ? Math.max(1, Math.ceil((new Date(result.resetAt) - Date.now()) / 1000))
      : budget.windowSeconds;
    res.setHeader('Retry-After', String(retryAfter));
    fail(res, 429, 'Too many requests — please wait a moment and try again.', { retryAfter });
    return false;
  }
  return true;
}
