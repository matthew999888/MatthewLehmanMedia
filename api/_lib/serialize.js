// One shared shape for a gallery, so the API and the front-end never drift.
//
// The browser receives ready-to-use URLs and never has to know that Drive ids
// exist — that keeps all the Drive URL trivia in one file.

import { driveThumbUrl, driveThumbFallbackUrl, drivePreviewUrl, parseDriveId } from './drive.js';
import { SUPABASE_URL } from './env.js';

const GRID_WIDTH = 1000;   // masonry tiles
const FULL_WIDTH = 1920;   // lightbox
const BUCKET = 'gallery-photos';

// Files from the admin panel's uploader rather than Drive. The bucket is
// public, so this is pure URL construction — no round-trip, no expiry.
export function storageUrl(path) {
  if (!path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export function serializeMedia(m) {
  const driveId = m.drive_file_id || null;
  const stored = m.storage_path ? storageUrl(m.storage_path) : '';
  return {
    id: m.id,
    kind: m.kind || 'photo',
    caption: m.caption || '',
    sortOrder: m.sort_order ?? 0,
    // Grid thumbnail. For a video this is the Drive poster frame.
    thumb: driveId ? driveThumbUrl(driveId, GRID_WIDTH) : (stored || m.thumb_url || m.url || ''),
    // Full-size still, used by the lightbox for photos.
    full: driveId ? driveThumbUrl(driveId, FULL_WIDTH) : (stored || m.thumb_url || m.url || ''),
    // Used by the page's onerror handler if the lh3 host ever stops working.
    thumbFallback: driveId ? driveThumbFallbackUrl(driveId, GRID_WIDTH) : '',
    // Embeddable player, videos only.
    embed: m.kind === 'video' && driveId ? drivePreviewUrl(driveId) : null,
    // Always route downloads through the API so they can be counted, rate
    // limited, and permission-checked.
    download: `/api/download?m=${encodeURIComponent(m.id)}`,
  };
}

export function serializeGallery(g, { includeSecret = false } = {}) {
  const media = (g.media || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(serializeMedia);

  const coverDriveId = parseDriveId(g.cover_url);
  const cover = coverDriveId
    ? driveThumbUrl(coverDriveId, GRID_WIDTH)
    : g.cover_url || (media.length ? media[0].thumb : '');

  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    description: g.description || '',
    cover,
    visibility: g.visibility,
    isPrivate: g.visibility === 'private',
    downloadsEnabled: g.downloads_enabled !== false,
    pixiesetUrl: g.pixieset_url || null,
    shootDate: g.shoot_date || null,
    sortOrder: g.sort_order ?? 0,
    categoryIds: (g.gallery_categories || []).map((gc) => gc.category_id),
    photoCount: media.filter((m) => m.kind === 'photo').length,
    videoCount: media.filter((m) => m.kind === 'video').length,
    media,
    ...(includeSecret ? { secretSlug: g.secret_slug, linkAccessEnabled: g.link_access_enabled } : {}),
  };
}

// The column list every gallery read uses. Kept here so adding a field means
// touching one line, not six queries.
export const GALLERY_SELECT =
  'id, slug, title, description, cover_url, visibility, downloads_enabled, pixieset_url, ' +
  'shoot_date, sort_order, secret_slug, link_access_enabled, ' +
  'media(id, kind, drive_file_id, url, thumb_url, storage_path, caption, sort_order), ' +
  'gallery_categories(category_id)';
