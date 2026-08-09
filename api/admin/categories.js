// /api/admin/categories — the filter pills on the gallery page.
//
//   GET                          list
//   POST   { name }              create
//   PATCH  { id, name?, sortOrder? }
//   DELETE ?id=                  delete (links to galleries cascade)

import { adminClient } from '../_lib/supabase.js';
import { requireAdmin, audit } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { ok, json, fail, methodIs, readJson, query, text } from '../_lib/http.js';
import { HAS_SUPABASE } from '../_lib/env.js';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'GET', 'POST', 'PATCH', 'DELETE')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');

  const caller = await requireAdmin(req, res);
  if (!caller) return;
  if (!(await enforce(req, res, 'adminWrite', caller.user.id))) return;

  const admin = adminClient();

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('categories')
      .select('id, name, sort_order')
      .order('sort_order', { ascending: true });
    if (error) return fail(res, 500, 'Could not load categories.');
    return json(res, 200, { ok: true, categories: data || [] });
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const name = text(body.name, 60);
    if (!name) return fail(res, 400, 'A category needs a name.');

    const { count } = await admin.from('categories').select('id', { count: 'exact', head: true });

    const { data, error } = await admin
      .from('categories')
      .insert({ name, sort_order: count ?? 0 })
      .select()
      .single();

    if (error) {
      // citext unique index — a friendlier message than the raw constraint.
      if (error.code === '23505') return fail(res, 409, `"${name}" already exists.`);
      return fail(res, 400, error.message);
    }
    await audit(caller.user.id, 'category.create', 'category', data.id, { name });
    return json(res, 201, { ok: true, category: data });
  }

  if (req.method === 'PATCH') {
    const body = await readJson(req);
    const id = text(body.id, 64);
    if (!id) return fail(res, 400, 'Missing category id.');

    const patch = {};
    if (body.name !== undefined) {
      const name = text(body.name, 60);
      if (!name) return fail(res, 400, 'A category needs a name.');
      patch.name = name;
    }
    if (body.sortOrder !== undefined) patch.sort_order = Number(body.sortOrder) || 0;
    if (!Object.keys(patch).length) return fail(res, 400, 'Nothing to change.');

    const { data, error } = await admin.from('categories').update(patch).eq('id', id).select().single();
    if (error) {
      if (error.code === '23505') return fail(res, 409, 'A category with that name already exists.');
      return fail(res, 400, error.message);
    }
    await audit(caller.user.id, 'category.update', 'category', id, patch);
    return ok(res, { category: data });
  }

  const id = String(query(req).id || '').trim();
  if (!id) return fail(res, 400, 'Missing category id.');
  const { error } = await admin.from('categories').delete().eq('id', id);
  if (error) return fail(res, 400, error.message);
  await audit(caller.user.id, 'category.delete', 'category', id);
  return ok(res, { deleted: id });
}
