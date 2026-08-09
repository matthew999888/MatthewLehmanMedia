// Cloudflare Turnstile verification.
//
// Unlike the rate limiter, this fails CLOSED when it is configured but the
// check does not pass. When it is NOT configured at all (no secret key set),
// it passes through, so the site keeps working before you have created the
// widget — see README-SETUP.md.

import { TURNSTILE_SECRET_KEY, HAS_TURNSTILE, clientIp } from './env.js';
import { fail } from './http.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, ip) {
  if (!HAS_TURNSTILE) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: 'missing-input-response' };

  const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.success
      ? { ok: true }
      : { ok: false, reason: (data['error-codes'] || []).join(', ') || 'verification-failed' };
  } catch (err) {
    // A Cloudflare outage should not become a signup outage, but we say so
    // loudly in the logs.
    console.error('[turnstile] verification unreachable, allowing:', err.message);
    return { ok: true, degraded: true };
  }
}

/**
 * Verify and answer with 400 on failure. Returns true when the caller may
 * proceed.
 */
export async function enforceTurnstile(req, res, token) {
  const result = await verifyTurnstile(token, clientIp(req));
  if (result.ok) return true;
  fail(res, 400, 'Human verification failed — please try again.', { reason: result.reason });
  return false;
}
