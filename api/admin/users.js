// /api/admin/users — the people with accounts.
//
//   GET                            list, with how many galleries each can see
//   PATCH  { id, isAdmin }         promote / demote
//
// There is deliberately no create-user route: signup is public and goes
// through /api/auth/signup, and access is granted by email in access.js,
// which works whether or not the person has signed up yet.

import { adminClient } from '../_lib/supabase.js';
import { requireAdmin, audit } from '../_lib/auth.js';
import { enforce } from '../_lib/ratelimit.js';
import { ok, json, fail, methodIs, readJson, text } from '../_lib/http.js';
import { HAS_SUPABASE } from '../_lib/env.js';

export default async function handler(req, res) {
  if (!methodIs(req, res, 'GET', 'PATCH')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'The gallery service is not configured yet.');

  const caller = await requireAdmin(req, res);
  if (!caller) return;
  if (!(await enforce(req, res, 'adminWrite', caller.user.id))) return;

  const admin = adminClient();

  if (req.method === 'GET') {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, email, full_name, is_admin, created_at')
      .order('created_at', { ascending: false });
    if (error) return fail(res, 500, 'Could not load users.');

    const { data: grants } = await admin.from('gallery_access').select('email, user_id');
    const counts = new Map();
    for (const g of grants || []) {
      const key = g.user_id || `email:${g.email}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Confirmation status lives on auth.users, not profiles.
    const confirmed = new Map();
    try {
      for (let page = 1; page <= 20; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (!data?.users?.length) break;
        for (const u of data.users) confirmed.set(u.id, Boolean(u.email_confirmed_at));
        if (data.users.length < 1000) break;
      }
    } catch (err) {
      console.error('[admin/users] could not read confirmation state:', err.message);
    }

    return json(res, 200, {
      ok: true,
      users: (profiles || []).map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name || '',
        isAdmin: p.is_admin,
        confirmed: confirmed.get(p.id) ?? null,
        galleryCount: counts.get(p.id) || 0,
        createdAt: p.created_at,
      })),
    });
  }

  const body = await readJson(req);
  const id = text(body.id, 64);
  if (!id) return fail(res, 400, 'Missing user id.');
  if (body.isAdmin === undefined) return fail(res, 400, 'Nothing to change.');

  const isAdmin = Boolean(body.isAdmin);

  // Don't let the last admin remove their own access and lock everyone out.
  if (!isAdmin && id === caller.user.id) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true);
    if ((count ?? 0) <= 1) {
      return fail(res, 400, "You're the only admin — promote someone else before removing yourself.");
    }
  }

  const { data, error } = await admin
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', id)
    .select('id, email, is_admin')
    .single();

  if (error) return fail(res, 400, error.message);

  await audit(caller.user.id, isAdmin ? 'user.promote' : 'user.demote', 'profile', id);
  return ok(res, { user: data });
}
