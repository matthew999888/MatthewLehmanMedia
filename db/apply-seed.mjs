// Applies the starting content in gallery.html's FALLBACK_GALLERIES straight to
// Supabase, instead of going via the generated 002_seed.sql.
//
//   node --env-file=.env.local db/apply-seed.mjs
//
// Same contract as 002_seed.sql: idempotent, keyed on gallery slug, and a
// gallery's media list is replaced wholesale so re-running converges.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

// ── pull the array literal out of the page (same walk as generate-seed.mjs) ──
const html = readFileSync(join(root, 'gallery.html'), 'utf8');
const start = html.indexOf('const FALLBACK_GALLERIES = [');
if (start === -1) throw new Error('FALLBACK_GALLERIES not found in gallery.html');
const open = html.indexOf('[', start);
let depth = 0, end = -1;
for (let i = open; i < html.length; i++) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
}
if (end === -1) throw new Error('Unbalanced brackets in FALLBACK_GALLERIES');
const galleries = new Function(`return ${html.slice(open, end + 1)};`)();

const slugify = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const driveId = (url) => {
  if (!url) return null;
  const s = String(url);
  return (
    s.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ??
    s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)?.[1] ??
    s.match(/\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ??
    null
  );
};

const CATEGORY_RULES = [
  [/baseball/i,                    'Baseball'],
  [/tennis/i,                      'Tennis'],
  [/raider/i,                      'Raider Challenge'],
  [/afjrotc|crew game|fort knox/i, 'AFJROTC'],
];
const categoryFor = (title) => {
  for (const [re, name] of CATEGORY_RULES) if (re.test(title)) return name;
  return 'Extras';
};
const CATEGORY_ORDER = ['Baseball', 'Raider Challenge', 'AFJROTC', 'Tennis', 'Extras'];

const die = (label, error) => {
  if (!error) return;
  console.error(`${label}: ${error.message}`);
  process.exit(1);
};

// ── categories ──────────────────────────────────────────────────────────────
{
  const rows = CATEGORY_ORDER.map((name, sort_order) => ({ name, sort_order }));
  const { error } = await db.from('categories').upsert(rows, { onConflict: 'name' });
  die('categories', error);
}
const { data: catRows, error: catErr } = await db.from('categories').select('id, name');
die('read categories', catErr);
const catId = new Map(catRows.map((c) => [String(c.name), c.id]));

// ── galleries + media ───────────────────────────────────────────────────────
let mediaTotal = 0;
const usedSlugs = new Set();

for (const [gi, g] of galleries.entries()) {
  let slug = slugify(g.title);
  while (usedSlugs.has(slug)) slug = `${slug}-${gi}`;
  usedSlugs.add(slug);

  const row = {
    title: g.title,
    slug,
    description: g.description ?? null,
    cover_url: g.cover ?? null,
    visibility: g.visible === false ? 'private' : 'public',
    sort_order: gi,
  };

  const { data: saved, error: gErr } = await db
    .from('galleries')
    .upsert(row, { onConflict: 'slug' })
    .select('id')
    .single();
  die(`gallery ${slug}`, gErr);

  const { error: gcErr } = await db
    .from('gallery_categories')
    .upsert(
      { gallery_id: saved.id, category_id: catId.get(categoryFor(g.title)) },
      { onConflict: 'gallery_id,category_id' }
    );
  die(`category link ${slug}`, gcErr);

  // Replace the media list wholesale so re-running converges.
  const { error: delErr } = await db.from('media').delete().eq('gallery_id', saved.id);
  die(`clear media ${slug}`, delErr);

  const photos = (g.photos || []).filter(Boolean);
  if (photos.length) {
    const rows = photos.map((p, i) => {
      const id = driveId(p);
      return {
        gallery_id: saved.id,
        kind: 'photo',
        drive_file_id: id,
        url: id ? null : p,
        sort_order: i,
      };
    });
    const { error: mErr } = await db.from('media').insert(rows);
    die(`media ${slug}`, mErr);
    mediaTotal += rows.length;
  }

  console.log(`  ${slug.padEnd(34)} ${photos.length} photos`);
}

console.log(
  `\nSeeded ${galleries.length} galleries, ${mediaTotal} media, ${CATEGORY_ORDER.length} categories.`
);
