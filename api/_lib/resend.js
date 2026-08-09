// Resend delivery, over plain fetch — the REST call is one POST, so pulling in
// the SDK would add a dependency for no gain.
//
// Every send is written to email_log so the dashboard can show what went out
// and what bounced back as an error.

import { RESEND_API_KEY, RESEND_FROM, HAS_RESEND } from './env.js';
import { adminClient } from './supabase.js';

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * Send one email.
 *
 * Returns { ok, id?, error?, skipped? }. Never throws — a failed email should
 * surface as a clear message, not a 500 that hides what actually happened.
 */
export async function sendEmail({ to, subject, html, text, replyTo, kind, galleryId, sentBy }) {
  if (!HAS_RESEND) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email to', to);
    return { ok: false, skipped: true, error: 'Email is not configured yet.' };
  }

  const payload = {
    from: RESEND_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  let result;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    result = res.ok
      ? { ok: true, id: data.id }
      : { ok: false, error: data.message || data.name || `Resend returned ${res.status}` };
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  await logEmail({
    to: payload.to,
    kind: kind || 'unknown',
    galleryId,
    sentBy,
    resendId: result.id,
    error: result.ok ? null : result.error,
  });

  if (!result.ok) console.error('[resend] send failed:', result.error);
  return result;
}

async function logEmail({ to, kind, galleryId, sentBy, resendId, error }) {
  try {
    const rows = to.map((addr) => ({
      to_email: addr,
      kind,
      gallery_id: galleryId || null,
      sent_by: sentBy || null,
      resend_id: resendId || null,
      error: error || null,
    }));
    await adminClient().from('email_log').insert(rows);
  } catch (err) {
    console.error('[resend] could not write email_log:', err.message);
  }
}
