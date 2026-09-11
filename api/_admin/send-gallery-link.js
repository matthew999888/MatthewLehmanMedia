// POST /api/admin/send-gallery-link
//   { galleryId, emails, message?, alsoGrantAccess? }
//
// Emails a gallery's secret link to anyone. The recipient does NOT need an
// account — the link works on its own. That is the whole point: most clients
// just want their photos, not another login.
//
// alsoGrantAccess additionally records a gallery_access row, so if they ever do
// sign up with that address the gallery shows under "Your Galleries" too.

import { adminClient } from '../_lib/supabase.js';
import { requireAdmin, audit } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { sendEmail } from '../_lib/resend.js';
import { galleryLinkEmail } from '../_lib/emails.js';
import { ok, fail, methodIs, readJson, normalizeEmail, text } from '../_lib/http.js';
import { SITE_URL, HAS_SUPABASE, HAS_RESEND } from '../_lib/env.js';

const MAX_RECIPIENTS = 100;

export default async function handler(req, res) {
  if (!methodIs(req, res, 'POST')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');
  if (!HAS_RESEND) return fail(res, 503, 'Email is not set up yet — add RESEND_API_KEY to send links.');

  const caller = await requireAdmin(req, res);
  if (!caller) return;
  if (!(await enforce(req, res, 'sendLink', caller.user.id))) return;

  const body = await readJson(req);
  const galleryId = text(body.galleryId, 64);
  if (!galleryId) return fail(res, 400, 'Missing gallery id.');

  const raw = Array.isArray(body.emails) ? body.emails : String(body.emails || '').split(/[\s,;]+/);
  const emails = [...new Set(raw.map(normalizeEmail).filter(Boolean))];
  if (!emails.length) return fail(res, 400, 'Please enter at least one valid email address.');
  if (emails.length > MAX_RECIPIENTS) {
    return fail(res, 400, `Please send to at most ${MAX_RECIPIENTS} people at a time.`);
  }

  const admin = adminClient();
  const { data: gallery, error } = await admin
    .from('galleries')
    .select('id, title, secret_slug, cover_url, link_access_enabled')
    .eq('id', galleryId)
    .maybeSingle();

  if (error || !gallery) return fail(res, 404, 'Gallery not found.');

  // Sending a link that demands a login, to people who may not have accounts,
  // just generates confused replies. Say so instead.
  if (gallery.link_access_enabled === false && !body.alsoGrantAccess) {
    return fail(
      res,
      400,
      'Link access is turned off for this gallery, so the link alone will not open it. ' +
        'Turn link access back on, or tick "also grant account access" and have them sign in.'
    );
  }

  if (body.alsoGrantAccess) {
    await admin.from('gallery_access').upsert(
      emails.map((email) => ({
        gallery_id: galleryId,
        email,
        granted_by: caller.user.id,
      })),
      { onConflict: 'gallery_id,email' }
    );
  }

  const url = `${SITE_URL}/g/${gallery.secret_slug}`;
  const message = text(body.message, 2000);

  const sentTo = [];
  const failures = [];

  for (const email of emails) {
    const mail = galleryLinkEmail({
      galleryTitle: gallery.title,
      galleryUrl: url,
      message,
      coverUrl: gallery.cover_url,
    });
    const result = await sendEmail({
      to: email,
      ...mail,
      replyTo: caller.profile?.email || undefined,
      kind: 'gallery_link',
      galleryId,
      sentBy: caller.user.id,
    });
    if (result.ok) sentTo.push(email);
    else failures.push({ email, error: result.error });
  }

  await audit(caller.user.id, 'gallery.send_link', 'gallery', galleryId, {
    sent: sentTo.length,
    failed: failures.length,
  });

  if (!sentTo.length) {
    return fail(res, 502, 'None of those emails could be sent.', { failures });
  }

  return ok(res, {
    sent: sentTo.length,
    failed: failures.length,
    failures,
    url,
    message: `Sent to ${sentTo.length} ${sentTo.length === 1 ? 'person' : 'people'}.`,
  });
}
