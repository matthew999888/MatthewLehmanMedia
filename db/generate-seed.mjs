// Regenerates db/002_seed.sql from the FALLBACK_GALLERIES array still living in
// gallery.html. That array is the offline safety net the page falls back to when
// Supabase is unreachable, so it doubles as the canonical starting content.
//
//   node db/generate-seed.mjs
//
// Re-running is safe: the emitted SQL is idempotent, keyed on gallery slug.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const html = readFileSync(join(root, 'gallery.html'), 'utf8');

// ── pull the array literal out of the page ────────────────────────────────
const start = html.indexOf('const FALLBACK_GALLERIES = [');
if (start === -1) throw new Error('FALLBACK_GALLERIES not found in gallery.html');

const open = html.indexOf('[', start);
let depth = 0, end = -1;
for (let i = open; i < html.length; i++) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
}
if (end === -1) throw new Error('Unbalanced brackets in FALLBACK_GALLERIES');

// Trusted local content — a plain array of object literals.
const galleries = new Function(`return ${html.slice(open, end + 1)};`)();

// ── helpers ───────────────────────────────────────────────────────────────
const sq = (v) =>
  v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`;

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Any Drive URL shape → the bare file id. Mirrors api/_lib/drive.js.
function driveId(url) {
  if (!url) return null;
  const s = String(url);
  return (
    s.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ??
    s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)?.[1] ??
    s.match(/\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ??
    null
  );
}

// Category assignment from the title. Keyword rules, first match wins.
const CATEGORY_RULES = [
  [/baseball/i,                      'Baseball'],
  [/tennis/i,                        'Tennis'],
  [/raider/i,                        'Raider Challenge'],
  [/afjrotc|crew game|fort knox/i,   'AFJROTC'],
];
function categoryFor(title) {
  for (const [re, name] of CATEGORY_RULES) if (re.test(title)) return name;
  return 'Extras';
}

const CATEGORY_ORDER = ['Baseball', 'Raider Challenge', 'AFJROTC', 'Tennis', 'Extras'];

// ── build the SQL ─────────────────────────────────────────────────────────
const out = [];
out.push('-- ═══════════════════════════════════════════════════════════════════════════');
out.push('-- Seed data — GENERATED FILE, do not hand-edit.');
out.push('-- Regenerate with:  node db/generate-seed.mjs');
out.push('--');
out.push('-- Source: the FALLBACK_GALLERIES array in gallery.html.');
out.push('-- Idempotent: keyed on gallery slug, safe to re-run. Re-running resets each');
out.push("-- seeded gallery's media list back to what gallery.html says, so don't re-run");
out.push('-- after you have curated these galleries in the admin panel.');
out.push('-- ═══════════════════════════════════════════════════════════════════════════');
out.push('');
out.push('begin;');
out.push('');

out.push('-- ── categories ────────────────────────────────────────────────────────────');
CATEGORY_ORDER.forEach((name, i) => {
  out.push(
    `insert into public.categories (name, sort_order) values (${sq(name)}, ${i})\n` +
    `  on conflict (name) do update set sort_order = excluded.sort_order;`
  );
});
out.push('');

let mediaTotal = 0;
const usedSlugs = new Set();

galleries.forEach((g, gi) => {
  let slug = slugify(g.title);
  while (usedSlugs.has(slug)) slug = `${slug}-${gi}`;
  usedSlugs.add(slug);

  const category = categoryFor(g.title);
  const visibility = g.visible === false ? 'private' : 'public';

  out.push(`-- ── ${g.title} ──`);
  out.push(
    `insert into public.galleries (title, slug, description, cover_url, visibility, sort_order)\n` +
    `values (${sq(g.title)}, ${sq(slug)}, ${sq(g.description)}, ${sq(g.cover)}, ${sq(visibility)}, ${gi})\n` +
    `on conflict (slug) do update set\n` +
    `  title = excluded.title,\n` +
    `  description = excluded.description,\n` +
    `  cover_url = excluded.cover_url,\n` +
    `  sort_order = excluded.sort_order;`
  );

  out.push(
    `insert into public.gallery_categories (gallery_id, category_id)\n` +
    `select g.id, c.id from public.galleries g, public.categories c\n` +
    ` where g.slug = ${sq(slug)} and c.name = ${sq(category)}\n` +
    `on conflict do nothing;`
  );

  // Replace this gallery's media wholesale so re-running converges.
  out.push(`delete from public.media where gallery_id = (select id from public.galleries where slug = ${sq(slug)});`);

  const photos = (g.photos || []).filter(Boolean);
  if (photos.length) {
    const rows = photos.map((p, i) => {
      const id = driveId(p);
      mediaTotal++;
      return `  ((select id from public.galleries where slug = ${sq(slug)}), 'photo', ${sq(id)}, ${id ? 'null' : sq(p)}, ${i})`;
    });
    out.push(
      `insert into public.media (gallery_id, kind, drive_file_id, url, sort_order) values\n` +
      rows.join(',\n') + ';'
    );
  }
  out.push('');
});

out.push('commit;');
out.push('');

writeFileSync(join(root, 'db', '002_seed.sql'), out.join('\n'), 'utf8');

console.log(
  `Wrote db/002_seed.sql — ${galleries.length} galleries, ${mediaTotal} media, ` +
  `${CATEGORY_ORDER.length} categories.`
);
