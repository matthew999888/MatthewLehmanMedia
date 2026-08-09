// GET /api/download?m=<media_id>[&s=<secret_slug>][&full=1]
//
// Why this exists rather than linking straight at Drive:
//
//   1. The browser's `download` attribute is ignored cross-origin, so a direct
//      Drive link opens a viewer instead of saving a file.
//   2. Downloads on a private gallery should still be permission-checked.
//   3. It gives the saved file a sensible name instead of a Drive id.
//
// Small files are proxied so the user gets a real "Save as". Anything large —
// and every video — is redirected to Drive instead, because pushing hundreds of
// megabytes through a serverless function is the wrong tool.

import { Readable } from 'node:stream';
import { adminClient } from './_lib/supabase.js';
import { getCaller } from './_lib/auth.js';
import { enforce } from './_lib/ratelimit.js';
import { driveDownloadUrl, driveThumbUrl } from './_lib/drive.js';
import { storageUrl } from './_lib/serialize.js';
import { fail, methodIs, query } from './_lib/http.js';
import { HAS_SUPABASE } from './_lib/env.js';

const MAX_PROXY_BYTES = 8 * 1024 * 1024; // above this, hand it to Drive directly

export default async function handler(req, res) {
  if (!methodIs(req, res, 'GET')) return;
  if (!HAS_SUPABASE) return fail(res, 503, 'Downloads are not available yet.');

  const q = query(req);
  const mediaId = String(q.m || '').trim();
  if (!mediaId) return fail(res, 400, 'Missing media id.');

  if (!(await enforce(req, res, 'download'))) return;

  const admin = adminClient();
  const { data: media, error } = await admin
    .from('media')
    .select('id, kind, drive_file_id, url, storage_path, caption, sort_order, gallery_id, ' +
            'galleries(id, slug, title, visibility, secret_slug, link_access_enabled, downloads_enabled)')
    .eq('id', mediaId)
    .maybeSingle();

  if (error) {
    console.error('[download] lookup failed:', error.message);
    return fail(res, 500, 'Could not load that file.');
  }
  if (!media || !media.galleries) return fail(res, 404, 'File not found.');

  const gallery = media.galleries;

  if (gallery.downloads_enabled === false) {
    return fail(res, 403, 'Downloads are turned off for this gallery.');
  }
  if (!(await mayAccess(admin, req, gallery, String(q.s || '').trim()))) {
    return fail(res, 403, 'You do not have access to this gallery.');
  }

  // Non-Drive media: just send them where the bytes live.
  if (!media.drive_file_id) {
    const target = media.storage_path ? storageUrl(media.storage_path) : media.url;
    if (!target) return fail(res, 404, 'File not found.');
    res.statusCode = 302;
    res.setHeader('Location', target);
    return res.end();
  }

  // Videos are always too big to be worth proxying.
  if (media.kind === 'video') {
    res.statusCode = 302;
    res.setHeader('Location', driveDownloadUrl(media.drive_file_id));
    return res.end();
  }

  return proxyPhoto(res, media, gallery);
}

// public | secret link | admin | explicitly granted
async function mayAccess(admin, req, gallery, secret) {
  if (gallery.visibility === 'public') return true;

  if (secret && secret === gallery.secret_slug && gallery.link_access_enabled !== false) {
    return true;
  }

  const caller = await getCaller(req);
  if (!caller) return false;
  if (caller.profile?.is_admin) return true;

  const { data } = await admin
    .from('gallery_access')
    .select('id')
    .eq('gallery_id', gallery.id)
    .eq('user_id', caller.user.id)
    .maybeSingle();

  return Boolean(data);
}

async function proxyPhoto(res, media, gallery) {
  // The original file first; fall back to a large render if Drive answers with
  // its virus-scan interstitial (which arrives as text/html, not an image).
  const candidates = [
    driveDownloadUrl(media.drive_file_id),
    driveThumbUrl(media.drive_file_id, 2048),
  ];

  for (const url of candidates) {
    let upstream;
    try {
      upstream = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    } catch (err) {
      console.error('[download] upstream fetch failed:', err.message);
      continue;
    }

    if (!upstream.ok || !upstream.body) continue;

    const type = upstream.headers.get('content-type') || '';
    if (type.includes('text/html')) continue; // interstitial, try the next one

    const length = Number(upstream.headers.get('content-length') || 0);
    if (length > MAX_PROXY_BYTES) {
      res.statusCode = 302;
      res.setHeader('Location', driveDownloadUrl(media.drive_file_id));
      return res.end();
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', type || 'image/jpeg');
    // Name the file after what actually came back, so a PNG isn't saved as .jpg.
    res.setHeader('Content-Disposition', contentDisposition(buildFilename(media, gallery, type)));
    if (length) res.setHeader('Content-Length', String(length));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return Readable.fromWeb(upstream.body).pipe(res);
  }

  // Everything failed — let Drive deal with it rather than erroring out.
  res.statusCode = 302;
  res.setHeader('Location', driveDownloadUrl(media.drive_file_id));
  return res.end();
}

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

function buildFilename(media, gallery, contentType) {
  const base = (media.caption || gallery.slug || gallery.title || 'photo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'photo';
  const n = String((media.sort_order ?? 0) + 1).padStart(3, '0');
  const ext = EXT_BY_TYPE[String(contentType || '').split(';')[0].trim()] || 'jpg';
  return `${base}-${n}.${ext}`;
}

// RFC 5987, so non-ASCII captions survive the trip.
function contentDisposition(filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
