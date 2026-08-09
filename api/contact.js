// POST /api/contact   { name, email, subject, message, turnstileToken, company }
//
// Backs the contact form on index.html, which until now had nowhere to send to.
// Turnstile + rate limit + a honeypot field, which together handle essentially
// all of the drive-by form spam.

import { enforce } from './_lib/ratelimit.js';
import { enforceTurnstile } from './_lib/turnstile.js';
import { sendEmail } from './_lib/resend.js';
import { contactEmail } from './_lib/emails.js';
import { ok, fail, methodIs, readJson, normalizeEmail, text } from './_lib/http.js';
import { OWNER_EMAIL, HAS_RESEND } from './_lib/env.js';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'POST')) return;

  const body = await readJson(req);

  // Honeypot: a field hidden from humans. Anything that fills it is a bot, and
  // gets a cheerful success it can't learn anything from.
  if (text(body.company, 200)) return ok(res, { message: 'Thanks — your message has been sent.' });

  const name = text(body.name, 120);
  const email = normalizeEmail(body.email);
  const message = text(body.message, 5000);
  const subject = text(body.subject, 200);

  if (!name) return fail(res, 400, 'Please tell me your name.');
  if (!email) return fail(res, 400, 'Please enter a valid email address.');
  if (!message || message.length < 5) return fail(res, 400, 'Please write a short message.');

  if (!(await enforce(req, res, 'contact'))) return;
  if (!(await enforceTurnstile(req, res, body.turnstileToken))) return;

  if (!HAS_RESEND) {
    return fail(res, 503, `Email isn't set up yet — please reach out directly at ${OWNER_EMAIL}.`);
  }

  const mail = contactEmail({ name, email, message, subject });
  const sent = await sendEmail({
    to: OWNER_EMAIL,
    ...mail,
    replyTo: email,       // replying in the inbox goes straight to the sender
    kind: 'contact_form',
  });

  if (!sent.ok) return fail(res, 502, "Your message couldn't be sent — please try again shortly.");

  return ok(res, { message: 'Thanks — your message has been sent.' });
}
