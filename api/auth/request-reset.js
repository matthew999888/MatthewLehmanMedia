// POST /api/auth/request-reset   { email, turnstileToken }
//
// Password reset, sent through Resend so it matches the rest of the site's
// mail. Enumeration-safe: always the same answer.

import { adminClient } from '../_lib/supabase.js';
import { enforce } from '../_lib/ratelimit.js';
import { enforceTurnstile } from '../_lib/turnstile.js';
import { sendEmail } from '../_lib/resend.js';
import { passwordResetEmail } from '../_lib/emails.js';
import { ok, fail, methodIs, readJson, normalizeEmail } from '../_lib/http.js';
import { SITE_URL, HAS_SUPABASE } from '../_lib/env.js';

const GENERIC_OK = 'If there is an account for that address, a reset link is on its way.';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'POST')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'Accounts are not available yet.');

  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!email) return fail(res, 400, 'Please enter a valid email address.');

  if (!(await enforce(req, res, 'passwordReset'))) return;
  if (!(await enforce(req, res, 'passwordReset', email))) return;
  if (!(await enforceTurnstile(req, res, body.turnstileToken))) return;

  try {
    const { data } = await adminClient().auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE_URL}/login.html?reset=1` },
    });
    if (data?.properties?.action_link) {
      const mail = passwordResetEmail({ resetUrl: data.properties.action_link });
      await sendEmail({ to: email, ...mail, kind: 'password_reset' });
    }
  } catch (err) {
    console.error('[auth/request-reset]', err.message);
  }

  return ok(res, { message: GENERIC_OK });
}
