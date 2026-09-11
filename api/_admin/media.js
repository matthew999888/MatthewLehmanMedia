// /api/admin/media — the photos and videos inside a gallery.
//
//   POST   { galleryId, links, kind }        bulk-add from pasted Drive links
//   PATCH  { id, caption?, kind? }           edit one item
//   PATCH  { galleryId, order: [id, ...] }   reorder
//   DELETE ?id=                              remove one item
//
// The pasted-links path is the main way photos get in now: paste whatever
// Drive gave you — share links, preview links, old thumbnail URLs, one per
// line — and parseMediaBlob sorts out the rest.

import { adminClient } from '../_lib/supabase.js';
import { requireAdmin, audit } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { parseMediaBlob } from '../_lib/drive.js';
import { serializeMedia } from '../_lib/serialize.js';
import { ok, json, fail, methodIs, readJson, query, text } from '../_lib/http.js';
import { HAS_SUPABASE } from '../_lib/env.js';

const MAX_PER_BATCH = 500;

export default async function handler(req, res) {
  if (!methodIs(req, res, 'POST', 'PATCH', 'DELETE')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');

  const caller = await requireAdmin(req, res);
  if (!caller) return;
  if (!(await enforce(req, res, 'adminWrite', caller.user.id))) return;

  const admin = adminClient();

  if (req.method === 'POST') return add(admin, req, res, caller);
  if (req.method === 'PATCH') return patch(admin, req, res, caller);
  return remove(admin, req, res, caller);
}

async function add(admin, req, res, caller) {
  const body = await readJson(req);
  const galleryId = text(body.galleryId, 64);
  if (!galleryId) return fail(res, 400, 'Missing gallery id.');

  const kind = body.kind === 'video' ? 'video' : 'photo';
  const { accepted, rejected } = parseMediaBlob(body.links, kind);

  if (!accepted.length) {
    return fail(res, 400, "None of those looked like a link I can use.", { rejected });
  }
  if (accepted.length > MAX_PER_BATCH) {
    return fail(res, 400, `That's ${accepted.length} links — please add at most ${MAX_PER_BATCH} at a time.`);
  }

  // Don't re-add anything the gallery already has.
  const { data: existing } = await admin
    .from('media')
    .select('drive_file_id, url, sort_order')
    .eq('gallery_id', galleryId);

  const seenDrive = new Set((existing || []).map((m) => m.drive_file_id).filter(Boolean));
  const seenUrl = new Set((existing || []).map((m) => m.url).filter(Boolean));
  const nextOrder = (existing || []).reduce((max, m) => Math.max(max, m.sort_order ?? 0), -1) + 1;

  const fresh = accepted.filter(
    (m) => !(m.drive_file_id && seenDrive.has(m.drive_file_id)) && !(m.url && seenUrl.has(m.url))
  );
  const duplicates = accepted.length - fresh.length;

  if (!fresh.length) {
    return ok(res, { added: 0, duplicates, rejected, media: [], message: 'Those are all already in this gallery.' });
  }

  const rows = fresh.map((m, i) => ({
    gallery_id: galleryId,
    kind: m.kind,
    drive_file_id: m.drive_file_id,
    url: m.url,
    sort_order: nextOrder + i,
  }));

  const { data, error } = await admin.from('media').insert(rows).select();
  if (error) {
    console.error('[admin/media] insert failed:', error.message);
    return fail(res, 400, error.message);
  }

  await audit(caller.user.id, 'media.add', 'gallery', galleryId, {
    added: data.length, duplicates, rejected: rejected.length, kind,
  });

  return json(res, 201, {
    ok: true,
    added: data.length,
    duplicates,
    rejected,
    media: data.map(serializeMedia),
  });
}

async function patch(admin, req, res, caller) {
  const body = await readJson(req);

  // Reorder: one row per position, applied as a batch.
  if (Array.isArray(body.order)) {
    const galleryId = text(body.galleryId, 64);
    if (!galleryId) return fail(res, 400, 'Missing gallery id.');

    const updates = body.order
      .filter(Boolean)
      .map((id, index) =>
        admin.from('media').update({ sort_order: index }).eq('id', id).eq('gallery_id', galleryId)
      );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) return fail(res, 400, failed.error.message);

    await audit(caller.user.id, 'media.reorder', 'gallery', galleryId, { count: body.order.length });
    return ok(res, { reordered: body.order.length });
  }

  const id = text(body.id, 64);
  if (!id) return fail(res, 400, 'Missing media id.');

  const update = {};
  if (body.caption !== undefined) update.caption = text(body.caption, 300);
  if (body.kind !== undefined) update.kind = body.kind === 'video' ? 'video' : 'photo';
  if (body.sortOrder !== undefined) update.sort_order = Number(body.sortOrder) || 0;

  if (!Object.keys(update).length) return fail(res, 400, 'Nothing to change.');

  const { data, error } = await admin.from('media').update(update).eq('id', id).select().single();
  if (error) return fail(res, 400, error.message);

  await audit(caller.user.id, 'media.update', 'media', id, update);
  return ok(res, { media: serializeMedia(data) });
}

async function remove(admin, req, res, caller) {
  const id = String(query(req).id || '').trim();
  if (!id) return fail(res, 400, 'Missing media id.');

  const { error } = await admin.from('media').delete().eq('id', id);
  if (error) return fail(res, 400, error.message);

  await audit(caller.user.id, 'media.delete', 'media', id);
  return ok(res, { deleted: id });
}
