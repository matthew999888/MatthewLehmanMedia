// Imports the Drive folders captured in .drive-import/manifest.json into
// Supabase as galleries.
//
//   node --env-file=.env.local db/import-drive.mjs [--dry]
//
// Idempotent, keyed on gallery slug, and a gallery's media list is replaced
// wholesale so re-running converges — same contract as db/apply-seed.mjs.
//
// Slugs are pinned per folder rather than derived from the title, so a folder
// that corresponds to one of the seeded galleries updates that row instead of
// creating a near-duplicate beside it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const DRY = process.argv.includes('--dry');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const manifest = JSON.parse(
  readFileSync(join(root, '.drive-import', 'manifest.json'), 'utf8')
);

// folder key → [slug, sort_order]. Order is display order on the grid:
// newest season first, then the 2025-26 season by sport.
const PLAN = [
  ['volleyball',   'volleyball-2026-09-10'],
  ['soccervar',    'varsity-soccer-2026-08-25'],
  ['soccerjv',     'jv-soccer-2026-08-25'],
  ['bb1',          'baseball-2026-game-1'],
  ['bb2',          'baseball-2026-game-2'],
  ['bb3',          'baseball-2026-game-3'],
  ['bb4',          'baseball-2026-game-4'],
  ['bb5',          'baseball-2026-game-5'],
  ['bb6',          'baseball-2026-game-6'],
  ['whetstone',    'logan-vs-whetstone'],
  ['raiderprac',   'raider-practice-2025'],
  ['raiderprac2',  'raider-practice-2-before-fort-knox'],
  ['raidingfr',    'raider-meet'],
  ['homeraider',   'home-raider-meet-2025'],
  ['liveoaks',     'live-oaks-raider-meet-2025'],
  ['fortknox',     'fort-knox-photos-2025-2026'],
  ['opendrill',    'open-drill-nationals'],
  ['drillupload',  'drill-practice'],
  ['summerdrill',  'summer-drill-practice'],
  ['crewgame',     'afjrotc-columbus-crew-game'],
  ['tennis1',      'tennis-pictures-2026'],
  ['tennis2',      'tennis-2026-match-2'],
  ['prom',         'emily-jacob-prom'],
];

const CATEGORY_RULES = [
  [/baseball/i,                       'Baseball'],
  [/tennis/i,                         'Tennis'],
  [/raider/i,                         'Raider Challenge'],
  [/afjrotc|crew game|fort knox|drill/i, 'AFJROTC'],
  [/soccer/i,                         'Soccer'],
  [/volleyball/i,                     'Volleyball'],
  [/prom/i,                           'Portraits'],
];
const categoryFor = (t) => {
  for (const [re, name] of CATEGORY_RULES) if (re.test(t)) return name;
  return 'Extras';
};
const CATEGORY_ORDER = [
  'Baseball', 'Soccer', 'Volleyball', 'Raider Challenge',
  'AFJROTC', 'Tennis', 'Portraits', 'Extras',
];

const thumb = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

const die = (label, error) => {
  if (!error) return;
  console.error(`${label}: ${error.message}`);
  process.exit(1);
};

if (DRY) {
  let n = 0;
  for (const [key, slug] of PLAN) {
    const g = manifest[key];
    if (!g) { console.log(`  MISSING from manifest: ${key}`); continue; }
    // 2026-2027 is not shared publicly in Drive yet, so those stay unlisted.
    const vis = g.private || g.parent === '2026-2027' ? 'private' : 'public';
    console.log(
      `  ${slug.padEnd(38)} ${String(g.ids.length).padStart(3)} photos  ` +
      `${vis.padEnd(7)} ${categoryFor(g.title)}`
    );
    n += g.ids.length;
  }
  console.log(`\n${PLAN.length} galleries, ${n} photos (dry run — nothing written)`);
  process.exit(0);
}

// ── categories ──────────────────────────────────────────────────────────────
{
  const rows = CATEGORY_ORDER.map((name, sort_order) => ({ name, sort_order }));
  const { error } = await db.from('categories').upsert(rows, { onConflict: 'name' });
  die('categories', error);
}
const { data: catRows, error: catErr } = await db.from('categories').select('id, name');
die('read categories', catErr);
const catId = new Map(catRows.map((c) => [String(c.name), c.id]));

// ── galleries ───────────────────────────────────────────────────────────────
let total = 0;
for (const [i, [key, slug]] of PLAN.entries()) {
  const g = manifest[key];
  if (!g) { console.error(`missing manifest entry: ${key}`); process.exit(1); }

  const ids = [...new Set(g.ids)];      // same file twice in a folder is one tile
  const visibility = g.private || g.parent === '2026-2027' ? 'private' : 'public';

  const { data: saved, error: gErr } = await db
    .from('galleries')
    .upsert(
      {
        title: g.title,
        slug,
        description: `From Google Drive — ${g.parent} photos`,
        cover_url: ids.length ? thumb(ids[0]) : null,
        visibility,
        sort_order: i,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();
  die(`gallery ${slug}`, gErr);

  const { error: gcErr } = await db
    .from('gallery_categories')
    .upsert(
      { gallery_id: saved.id, category_id: catId.get(categoryFor(g.title)) },
      { onConflict: 'gallery_id,category_id' }
    );
  die(`category ${slug}`, gcErr);

  const { error: delErr } = await db.from('media').delete().eq('gallery_id', saved.id);
  die(`clear media ${slug}`, delErr);

  if (ids.length) {
    const rows = ids.map((id, n) => ({
      gallery_id: saved.id,
      kind: 'photo',
      drive_file_id: id,
      sort_order: n,
    }));
    const { error: mErr } = await db.from('media').insert(rows);
    die(`media ${slug}`, mErr);
    total += rows.length;
  }

  console.log(`  ${slug.padEnd(38)} ${String(ids.length).padStart(3)} photos  ${visibility}`);
}

console.log(`\nImported ${PLAN.length} galleries, ${total} photos.`);
