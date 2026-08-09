// Supabase clients for server-side use.
//
// Two very different things live here, and mixing them up is the classic way to
// leak data:
//
//   adminClient()  — service role. Bypasses RLS entirely. Only for work the
//                    caller has already been authorised to do, or for the
//                    secret-link path where the secret itself is the proof.
//
//   userClient(jwt) — carries the caller's own token, so RLS applies exactly as
//                    it would in the browser. Prefer this whenever possible.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, HAS_SUPABASE } from './env.js';

let _admin = null;

export function adminClient() {
  if (!HAS_SUPABASE) throw new Error('Supabase is not configured on the server');
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

export function userClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });
}

export function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  return match ? match[1].trim() : null;
}
