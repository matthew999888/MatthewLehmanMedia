// Central place for environment configuration.
//
// Everything here degrades rather than throws. A missing Turnstile secret or
// Resend key must not take the whole site down — the affected feature simply
// reports itself as unconfigured, exactly like the SUPABASE_CONNECTED flag the
// front-end pages have always used.

export const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';

export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
export const RESEND_FROM =
  process.env.RESEND_FROM || 'Matthew Lehman Media <noreply@matthewlehmanmedia.com>';

// Where the owner's own notifications (contact form, etc.) land.
export const OWNER_EMAIL = process.env.OWNER_EMAIL || 'soursauce29@gmail.com';

export const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '') ||
  'https://www.matthewlehmanmedia.com'
).replace(/\/+$/, '');

export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
export const HAS_TURNSTILE = Boolean(TURNSTILE_SECRET_KEY);
export const HAS_RESEND = Boolean(RESEND_API_KEY);

// Resolve the caller's IP from the proxy headers Vercel sets.
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}
