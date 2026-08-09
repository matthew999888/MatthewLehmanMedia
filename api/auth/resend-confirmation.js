// POST /api/auth/resend-confirmation   { email, turnstileToken }
//
// Re-sends the signup confirmation. Same enumeration-safe response as signup:
// the caller learns nothing about whether the address exists.

import { adminClient } from '../_lib/supabase.js';
import { enforce } from '../_lib/ratelimit.js';
import { enforceTurnstile } from '../_lib/turnstile.js';
import { sendEmail } from '../_lib/resend.js';
import { confirmSignupEmail } from '../_lib/emails.js';
import { ok, fail, methodIs, readJson, normalizeEmail } from '../_lib/http.js';
import { SITE_URL, HAS_SUPABASE } from '../_lib/env.js';

const GENERIC_OK = 'If that address needs confirming, a new link is on its way.';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'POST')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'Accounts are not available yet.');

  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!email) return fail(res, 400, 'Please enter a valid email address.');

  if (!(await enforce(req, res, 'resendConfirm'))) return;
  if (!(await enforce(req, res, 'resendConfirm', email))) return;
  if (!(await enforceTurnstile(req, res, body.turnstileToken))) return;

  try {
    const admin = adminClient();
    const { data } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: { redirectTo: `${SITE_URL}/login.html?confirmed=1` },
    });
    if (data?.properties?.action_link) {
      const mail = confirmSignupEmail({ confirmUrl: data.properties.action_link });
      await sendEmail({ to: email, ...mail, kind: 'signup_confirm_resend' });
    }
  } catch (err) {
    // Most commonly "user already confirmed" — not something to report back.
    console.error('[auth/resend-confirmation]', err.message);
  }

  return ok(res, { message: GENERIC_OK });
}
