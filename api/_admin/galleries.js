// /api/admin/galleries — create, read, update, delete galleries.
//
//   GET                       every gallery, including private ones and secrets
//   POST                      create
//   PATCH  { id, ...fields }  update; action:'regenerate-secret' rotates the link
//   DELETE ?id=               delete (media rows cascade)
//
// Admin-only, checked server-side against profiles.is_admin on every call.

import { adminClient } from '../_lib/supabase.js';
import { requireAdmin, audit } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { serializeGallery, GALLERY_SELECT } from '../_lib/serialize.js';
import { ok, json, fail, methodIs, readJson, query, text, slugify } from '../_lib/http.js';
import { HAS_SUPABASE } from '../_lib/env.js';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'GET', 'POST', 'PATCH', 'DELETE')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');

  const caller = await requireAdmin(req, res);
  if (!caller) return;
  if (!(await enforce(req, res, 'adminWrite', caller.user.id))) return;

  const admin = adminClient();

  if (req.method === 'GET') return list(admin, res);
  if (req.method === 'POST') return create(admin, req, res, caller);
  if (req.method === 'PATCH') return update(admin, req, res, caller);
  return remove(admin, req, res, caller);
}

async function list(admin, res) {
  const { data, error } = await admin
    .from('galleries')
    .select(GALLERY_SELECT)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[admin/galleries] list failed:', error.message);
    return fail(res, 500, 'Could not load galleries.');
  }
  return json(res, 200, {
    ok: true,
    galleries: (data || []).map((g) => serializeGallery(g, { includeSecret: true })),
  });
}

async function create(admin, req, res, caller) {
  const body = await readJson(req);
  const title = text(body.title, 200);
  if (!title) return fail(res, 400, 'A gallery needs a title.');

  const slug = await uniqueSlug(admin, slugify(title) || 'gallery');

  const { data, error } = await admin
    .from('galleries')
    .insert({
      title,
      slug,
      description: text(body.description, 2000),
      cover_url: text(body.coverUrl, 800),
      visibility: body.visibility === 'private' ? 'private' : 'public',
      link_access_enabled: body.linkAccessEnabled !== false,
      downloads_enabled: body.downloadsEnabled !== false,
      pixieset_url: text(body.pixiesetUrl, 800),
      shoot_date: body.shootDate || null,
      sort_order: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
    })
    .select(GALLERY_SELECT)
    .single();

  if (error) {
    console.error('[admin/galleries] create failed:', error.message);
    return fail(res, 400, error.message);
  }

  await setCategories(admin, data.id, body.categoryIds);
  await audit(caller.user.id, 'gallery.create', 'gallery', data.id, { title });

  return json(res, 201, { ok: true, gallery: serializeGallery(data, { includeSecret: true }) });
}

async function update(admin, req, res, caller) {
  const body = await readJson(req);
  const id = text(body.id, 64);
  if (!id) return fail(res, 400, 'Missing gallery id.');

  // Rotating the secret instantly invalidates every link already sent out.
  if (body.action === 'regenerate-secret') {
    const secret = newSecret();
    const { data, error } = await admin
      .from('galleries')
      .update({ secret_slug: secret })
      .eq('id', id)
      .select(GALLERY_SELECT)
      .single();
    if (error) return fail(res, 400, error.message);
    await audit(caller.user.id, 'gallery.regenerate_secret', 'gallery', id);
    return ok(res, { gallery: serializeGallery(data, { includeSecret: true }) });
  }

  const patch = {};
  if (body.title !== undefined) {
    const title = text(body.title, 200);
    if (!title) return fail(res, 400, 'A gallery needs a title.');
    patch.title = title;
  }
  if (body.description !== undefined) patch.description = text(body.description, 2000);
  if (body.coverUrl !== undefined) patch.cover_url = text(body.coverUrl, 800);
  if (body.visibility !== undefined) {
    patch.visibility = body.visibility === 'private' ? 'private' : 'public';
  }
  if (body.linkAccessEnabled !== undefined) patch.link_access_enabled = Boolean(body.linkAccessEnabled);
  if (body.downloadsEnabled !== undefined) patch.downloads_enabled = Boolean(body.downloadsEnabled);
  if (body.pixiesetUrl !== undefined) patch.pixieset_url = text(body.pixiesetUrl, 800);
  if (body.shootDate !== undefined) patch.shoot_date = body.shootDate || null;
  if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;

  // Retitling moves the public URL, so keep the slug in step.
  if (body.retitleSlug && patch.title) {
    patch.slug = await uniqueSlug(admin, slugify(patch.title) || 'gallery', id);
  }

  if (Object.keys(patch).length) {
    const { error } = await admin.from('galleries').update(patch).eq('id', id);
    if (error) {
      console.error('[admin/galleries] update failed:', error.message);
      return fail(res, 400, error.message);
    }
  }

  if (body.categoryIds !== undefined) await setCategories(admin, id, body.categoryIds);

  const { data, error: readErr } = await admin
    .from('galleries')
    .select(GALLERY_SELECT)
    .eq('id', id)
    .single();
  if (readErr) return fail(res, 404, 'Gallery not found.');

  await audit(caller.user.id, 'gallery.update', 'gallery', id, patch);
  return ok(res, { gallery: serializeGallery(data, { includeSecret: true }) });
}

async function remove(admin, req, res, caller) {
  const id = String(query(req).id || '').trim();
  if (!id) return fail(res, 400, 'Missing gallery id.');

  const { error } = await admin.from('galleries').delete().eq('id', id);
  if (error) {
    console.error('[admin/galleries] delete failed:', error.message);
    return fail(res, 400, error.message);
  }
  await audit(caller.user.id, 'gallery.delete', 'gallery', id);
  return ok(res, { deleted: id });
}

// ── helpers ────────────────────────────────────────────────────────────────

async function setCategories(admin, galleryId, categoryIds) {
  await admin.from('gallery_categories').delete().eq('gallery_id', galleryId);
  const ids = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : [];
  if (!ids.length) return;
  await admin
    .from('gallery_categories')
    .insert(ids.map((category_id) => ({ gallery_id: galleryId, category_id })));
}

async function uniqueSlug(admin, base, ignoreId) {
  let slug = base;
  for (let n = 2; n < 200; n++) {
    let q = admin.from('galleries').select('id').eq('slug', slug).limit(1);
    if (ignoreId) q = q.neq('id', ignoreId);
    const { data } = await q;
    if (!data || !data.length) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

function newSecret() {
  // 18 random bytes as base64url — same shape as the column default.
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
