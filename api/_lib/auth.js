// Who is calling, and are they allowed?
//
// Admin status is read from the database every time. It is never taken from
// anything the client sent — not a header, not a JWT claim the browser could
// have shaped.

import { adminClient, bearerToken } from './supabase.js';
import { fail } from './http.js';

/**
 * Resolve the caller from their Supabase access token.
 * Returns { user, profile } or null when not signed in / token invalid.
 */
export async function getCaller(req) {
  const token = bearerToken(req);
  if (!token) return null;

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, is_admin')
    .eq('id', data.user.id)
    .maybeSingle();

  return { user: data.user, profile: profile || null, token };
}

/** 401s when not signed in. Returns the caller, or null once it has answered. */
export async function requireUser(req, res) {
  const caller = await getCaller(req);
  if (!caller) {
    fail(res, 401, 'You need to be signed in to do that.');
    return null;
  }
  return caller;
}

/** 401/403s unless the caller is an admin. */
export async function requireAdmin(req, res) {
  const caller = await getCaller(req);
  if (!caller) {
    fail(res, 401, 'You need to be signed in to do that.');
    return null;
  }
  if (!caller.profile?.is_admin) {
    fail(res, 403, 'Admin access required.');
    return null;
  }
  return caller;
}

/** Best-effort audit trail. Never blocks or throws into the request path. */
export async function audit(actorId, action, entity, entityId, meta) {
  try {
    await adminClient().from('audit_log').insert({
      actor: actorId || null,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      meta: meta || null,
    });
  } catch (err) {
    console.error('[audit] failed to record', action, err.message);
  }
}
