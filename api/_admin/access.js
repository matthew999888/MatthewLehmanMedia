// /api/admin/access — who can see a private gallery when they sign in.
//
//   GET    ?galleryId=          list the people with access
//   POST   { galleryId, emails, notify?, message? }   grant, optionally emailing them
//   DELETE ?id=                 revoke one grant
//
// Grants are keyed on email, so you can add someone who has not signed up yet.
// The handle_new_user trigger in db/001_schema.sql fills in their user_id the
// moment they confirm their account, and the gallery appears under "Your
// Galleries" without you having to come back and do anything.

import { adminClient } from '../_lib/supabase.js';
import { requireAdmin, audit } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { sendEmail } from '../_lib/resend.js';
import { galleryLinkEmail } from '../_lib/emails.js';
import { ok, json, fail, methodIs, readJson, query, normalizeEmail, text } from '../_lib/http.js';
import { SITE_URL, HAS_SUPABASE } from '../_lib/env.js';

const MAX_EMAILS = 100;

export default async function handler(req, res) {
  if (!methodIs(req, res, 'GET', 'POST', 'DELETE')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');

  const caller = await requireAdmin(req, res);
  if (!caller) return;
  if (!(await enforce(req, res, 'adminWrite', caller.user.id))) return;

  const admin = adminClient();

  if (req.method === 'GET') return list(admin, req, res);
  if (req.method === 'POST') return grant(admin, req, res, caller);
  return revoke(admin, req, res, caller);
}

async function list(admin, req, res) {
  const galleryId = String(query(req).galleryId || '').trim();
  if (!galleryId) return fail(res, 400, 'Missing gallery id.');

  const { data, error } = await admin
    .from('gallery_access')
    .select('id, email, user_id, created_at')
    .eq('gallery_id', galleryId)
    .order('created_at', { ascending: true });

  if (error) return fail(res, 500, 'Could not load the access list.');

  return json(res, 200, {
    ok: true,
    access: (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      // false = invited but hasn't made an account yet; the grant is waiting.
      hasAccount: Boolean(row.user_id),
      createdAt: row.created_at,
    })),
  });
}

async function grant(admin, req, res, caller) {
  const body = await readJson(req);
  const galleryId = text(body.galleryId, 64);
  if (!galleryId) return fail(res, 400, 'Missing gallery id.');

  const raw = Array.isArray(body.emails)
    ? body.emails
    : String(body.emails || '').split(/[\s,;]+/);

  const emails = [...new Set(raw.map(normalizeEmail).filter(Boolean))];
  if (!emails.length) return fail(res, 400, 'Please enter at least one valid email address.');
  if (emails.length > MAX_EMAILS) return fail(res, 400, `Please add at most ${MAX_EMAILS} people at a time.`);

  const { data: gallery, error: gErr } = await admin
    .from('galleries')
    .select('id, title, slug, secret_slug, cover_url')
    .eq('id', galleryId)
    .maybeSingle();
  if (gErr || !gallery) return fail(res, 404, 'Gallery not found.');

  // Match each email to an existing account where one exists, so access is
  // live immediately rather than waiting on the signup trigger.
  const userIdByEmail = await lookupUserIds(admin, emails);

  const rows = emails.map((email) => ({
    gallery_id: galleryId,
    email,
    user_id: userIdByEmail.get(email) || null,
    granted_by: caller.user.id,
  }));

  const { error } = await admin
    .from('gallery_access')
    .upsert(rows, { onConflict: 'gallery_id,email' });

  if (error) {
    console.error('[admin/access] grant failed:', error.message);
    return fail(res, 400, error.message);
  }

  await audit(caller.user.id, 'access.grant', 'gallery', galleryId, { emails });

  // Optionally send them the gallery straight away.
  let emailed = 0;
  const emailErrors = [];
  if (body.notify) {
    const url = `${SITE_URL}/g/${gallery.secret_slug}`;
    const message = text(body.message, 2000);
    for (const email of emails) {
      const mail = galleryLinkEmail({
        galleryTitle: gallery.title,
        galleryUrl: url,
        message,
        coverUrl: gallery.cover_url,
      });
      const sent = await sendEmail({
        to: email, ...mail, kind: 'gallery_access_granted',
        galleryId, sentBy: caller.user.id,
      });
      if (sent.ok) emailed++;
      else emailErrors.push({ email, error: sent.error });
    }
  }

  return ok(res, { granted: emails.length, emailed, emailErrors });
}

async function revoke(admin, req, res, caller) {
  const id = String(query(req).id || '').trim();
  if (!id) return fail(res, 400, 'Missing access id.');

  const { error } = await admin.from('gallery_access').delete().eq('id', id);
  if (error) return fail(res, 400, error.message);

  await audit(caller.user.id, 'access.revoke', 'gallery_access', id);
  return ok(res, { revoked: id });
}

// auth.users isn't queryable through PostgREST, so page the admin list.
async function lookupUserIds(admin, emails) {
  const wanted = new Set(emails);
  const found = new Map();
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        const e = (u.email || '').toLowerCase();
        if (wanted.has(e)) found.set(e, u.id);
      }
      if (data.users.length < 1000) break;
    }
  } catch (err) {
    // Not fatal: the signup trigger will link them up later.
    console.error('[admin/access] user lookup failed:', err.message);
  }
  return found;
}
