// Google Drive link handling.
//
// You paste whatever Drive hands you — a share link, a preview link, an old
// thumbnail URL — and everything downstream works off the bare file id.
//
// Recognised shapes:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?export=download&id=FILE_ID
//   https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
//   https://docs.google.com/document/d/FILE_ID/edit
//   https://lh3.googleusercontent.com/d/FILE_ID
//   FILE_ID                                    (bare, pasted on its own)

const ID = '[A-Za-z0-9_-]{10,}';

const PATTERNS = [
  new RegExp(`/file/d/(${ID})`),
  new RegExp(`/d/(${ID})`),
  new RegExp(`[?&]id=(${ID})`),
];

// A bare id pasted on its own, with no URL around it to confirm what it is.
// This has to be strict: the character class also matches ordinary hyphenated
// words, and treating "summer-team-photos" as a file id would silently create
// media rows that render as broken images.
//
// Real Drive ids are 28-44 characters and effectively always contain a digit,
// so requiring both is enough to tell them apart from prose. Anything that
// falls outside it can still be pasted as a full URL.
const BARE_ID = /^[A-Za-z0-9_-]{25,}$/;

export function parseDriveId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  if (BARE_ID.test(s) && /\d/.test(s)) return s;

  if (!/^https?:\/\//i.test(s)) return null;
  for (const re of PATTERNS) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

export function isDriveUrl(input) {
  return parseDriveId(input) !== null;
}

// Thumbnail / display image, resized by Google — which is what makes a
// 166-photo gallery load at all.
//
// TWO THINGS MATTER HERE, and getting either wrong shows the visitor a page
// of blank tiles:
//
//   1. Every <img> using these URLs must carry referrerpolicy="no-referrer".
//      Google throttles hotlinked Drive images by referrer: send one and you
//      get HTTP 429 back instead of the picture, on every image at once.
//
//   2. We point straight at lh3.googleusercontent.com — the host
//      drive.google.com/thumbnail merely redirects to. That skips a redirect
//      per image, and avoids drive.google.com setting Google auth cookies on
//      every page load (the third-party-cookie problem noted in index.html).
//
// driveThumbFallbackUrl is the old form, kept as an onerror fallback in case
// the lh3 shape ever changes.
export function driveThumbUrl(fileId, width = 1000) {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${width}`;
}

export function driveThumbFallbackUrl(fileId, width = 1000) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

// Embeddable player for a video file. Goes in an <iframe>.
export function drivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

// Direct bytes. Works reliably for images; large files hit Google's virus-scan
// interstitial, which is why videos are handed to the user as a Drive link
// rather than proxied.
export function driveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

// The URL a media row should display at.
export function displayUrlFor(media, width = 1000) {
  if (media.drive_file_id) return driveThumbUrl(media.drive_file_id, width);
  return media.thumb_url || media.url || '';
}

// Split a pasted blob of links into individual entries. Accepts newlines,
// commas, or whitespace between links, and ignores blank lines.
export function splitLinks(blob) {
  return String(blob || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Turn a pasted blob into media rows ready for insert. Anything unparseable is
// reported back rather than silently dropped, so the admin sees what failed.
export function parseMediaBlob(blob, kind = 'photo') {
  const accepted = [];
  const rejected = [];
  const seen = new Set();

  for (const link of splitLinks(blob)) {
    const driveId = parseDriveId(link);
    if (driveId) {
      if (seen.has(driveId)) continue;
      seen.add(driveId);
      accepted.push({ kind, drive_file_id: driveId, url: null });
      continue;
    }
    // Allow a plain direct image/video URL that isn't Drive at all.
    if (/^https?:\/\//i.test(link)) {
      if (seen.has(link)) continue;
      seen.add(link);
      accepted.push({ kind, drive_file_id: null, url: link });
      continue;
    }
    rejected.push(link);
  }

  return { accepted, rejected };
}
