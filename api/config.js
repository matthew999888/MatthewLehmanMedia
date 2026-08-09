// Public runtime configuration for the static pages.
//
// Everything returned here is safe to expose — the Supabase anon key and the
// Turnstile *site* key are both designed to live in page source. Serving them
// from here rather than hardcoding means rotating a key is an env var change,
// not an edit to three HTML files.

import { json, methodIs } from './_lib/http.js';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SITE_URL,
  HAS_TURNSTILE,
  HAS_RESEND,
  HAS_SUPABASE,
} from './_lib/env.js';

export default function handler(req, res) {
  if (!methodIs(req, res, 'GET')) return;

  return json(
    res,
    200,
    {
      ok: true,
      supabaseUrl: SUPABASE_URL || null,
      supabaseAnonKey: SUPABASE_ANON_KEY || null,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
      siteUrl: SITE_URL,
      features: {
        supabase: HAS_SUPABASE,
        turnstile: HAS_TURNSTILE,
        email: HAS_RESEND,
      },
    },
    { 'Cache-Control': 'public, max-age=60, s-maxage=300' }
  );
}
