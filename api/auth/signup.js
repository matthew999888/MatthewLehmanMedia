// POST /api/auth/signup   { email, password, fullName, turnstileToken }
//
// Creates the account and emails the confirmation link through Resend rather
// than Supabase's built-in mailer, so the message is branded and we aren't
// bound by Supabase's own send limits.
//
// The response is deliberately identical whether or not the address already
// has an account. Otherwise this endpoint becomes a way to test which of your
// clients are registered.

import { adminClient } from '../_lib/supabase.js';
import { enforce } from '../_lib/ratelimit.js';
import { enforceTurnstile } from '../_lib/turnstile.js';
import { sendEmail } from '../_lib/resend.js';
import { confirmSignupEmail, passwordResetEmail } from '../_lib/emails.js';
import { ok, fail, methodIs, readJson, normalizeEmail, text } from '../_lib/http.js';
import { SITE_URL, HAS_SUPABASE } from '../_lib/env.js';

const MIN_PASSWORD = 8;

// Same wording on every path — see the note above.
const GENERIC_OK =
  'Check your inbox — if that address can be registered, a confirmation link is on its way.';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'POST')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'Accounts are not available yet.');

  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const fullName = text(body.fullName, 120);

  if (!email) return fail(res, 400, 'Please enter a valid email address.');
  if (password.length < MIN_PASSWORD) {
    return fail(res, 400, `Please choose a password of at least ${MIN_PASSWORD} characters.`);
  }
  if (password.length > 200) return fail(res, 400, 'That password is too long.');

  // Two budgets: one stops an IP spraying addresses, the other stops one
  // address being hammered from many IPs.
  if (!(await enforce(req, res, 'signup'))) return;
  if (!(await enforce(req, res, 'signupEmail', email))) return;

  if (!(await enforceTurnstile(req, res, body.turnstileToken))) return;

  const admin = adminClient();
  const redirectTo = `${SITE_URL}/login.html?confirmed=1`;

  // generateLink creates the (unconfirmed) user and hands back the action link
  // without sending anything itself.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo,
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (!error && data?.properties?.action_link) {
    const mail = confirmSignupEmail({ confirmUrl: data.properties.action_link, name: fullName });
    const sent = await sendEmail({ to: email, ...mail, kind: 'signup_confirm' });

    if (!sent.ok && !sent.skipped) {
      // The account exists but they can never reach it — better to say so.
      return fail(res, 502, "We couldn't send the confirmation email. Please try again shortly.");
    }
    if (sent.skipped) {
      return ok(res, {
        message:
          'Your account was created, but confirmation email is not set up yet — ask Matthew to confirm it for you.',
        emailConfigured: false,
      });
    }
    return ok(res, { message: GENERIC_OK });
  }

  // Already registered: help the real owner of the address without confirming
  // to a stranger that it exists.
  if (isAlreadyRegistered(error)) {
    await handleExisting(admin, email, redirectTo);
    return ok(res, { message: GENERIC_OK });
  }

  console.error('[auth/signup] generateLink failed:', error?.message);
  return fail(res, 400, error?.message || 'Could not create that account.');
}

function isAlreadyRegistered(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('already exists') ||
    error?.code === 'email_exists'
  );
}

// Unconfirmed → send the confirmation again. Confirmed → send a reset link,
// since "I tried to sign up again" almost always means "I forgot my password".
async function handleExisting(admin, email, redirectTo) {
  try {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => (u.email || '').toLowerCase() === email);

    if (existing && !existing.email_confirmed_at) {
      const { data } = await admin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: undefined,
        options: { redirectTo },
      });
      if (data?.properties?.action_link) {
        const mail = confirmSignupEmail({ confirmUrl: data.properties.action_link });
        await sendEmail({ to: email, ...mail, kind: 'signup_confirm_resend' });
      }
      return;
    }

    const { data } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE_URL}/login.html?reset=1` },
    });
    if (data?.properties?.action_link) {
      const mail = passwordResetEmail({ resetUrl: data.properties.action_link });
      await sendEmail({ to: email, ...mail, kind: 'signup_existing_reset' });
    }
  } catch (err) {
    console.error('[auth/signup] existing-account handling failed:', err.message);
  }
}
