// GET /api/galleries/secret?s=<secret_slug>
//
// The secret-link path. This is the one place that reads a private gallery
// with the service role: holding the secret IS the authorisation, and that
// fact can't be expressed as an RLS policy without handing the secret to the
// database on every anon request.
//
// Because the secret is guessable in principle, this route is rate limited by
// IP and answers with an identical 404 whether the slug is wrong, the gallery
// was deleted, or link access was switched off — nothing here tells an
// enumerator they got warm.

import { adminClient } from '../_lib/supabase.js';
import { getCaller } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { serializeGallery, GALLERY_SELECT } from '../_lib/serialize.js';
import { json, fail, methodIs, query } from '../_lib/http.js';
import { HAS_SUPABASE } from '../_lib/env.js';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'GET')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');

  const secret = String(query(req).s || '').trim();
  if (!secret || secret.length > 128) return fail(res, 404, 'Gallery not found.');

  if (!(await enforce(req, res, 'secretLink'))) return;

  const admin = adminClient();
  const { data: gallery, error } = await admin
    .from('galleries')
    .select(GALLERY_SELECT)
    .eq('secret_slug', secret)
    .maybeSingle();

  if (error) {
    console.error('[galleries/secret] query failed:', error.message);
    return fail(res, 500, 'Could not load that gallery.');
  }
  if (!gallery) return fail(res, 404, 'Gallery not found.');

  // link_access_enabled = false means the secret alone is no longer enough:
  // the visitor must be signed in and granted, or be an admin.
  if (gallery.link_access_enabled === false) {
    const caller = await getCaller(req);
    const isAdmin = Boolean(caller?.profile?.is_admin);

    let granted = false;
    if (caller && !isAdmin) {
      const { data: access } = await admin
        .from('gallery_access')
        .select('id')
        .eq('gallery_id', gallery.id)
        .eq('user_id', caller.user.id)
        .maybeSingle();
      granted = Boolean(access);
    }

    if (!isAdmin && !granted) {
      return fail(res, 403, 'This gallery now requires you to sign in with an invited account.', {
        requiresLogin: true,
      });
    }
  }

  return json(
    res,
    200,
    { ok: true, gallery: serializeGallery(gallery) },
    { 'Cache-Control': 'private, no-store' }
  );
}
