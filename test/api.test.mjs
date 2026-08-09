// Integration tests — real handlers, real database, mock req/res.
//
// Needs the env vars from .env.local:
//   node --env-file=.env.local --test test/api.test.mjs
//
// Skips itself (rather than failing) when Supabase isn't configured, so
// `node --test test/` still passes on a bare checkout.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const CONFIGURED = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Minimal stand-in for Vercel's req/res pair. */
function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    end(chunk) { this.body = chunk; this.ended = true; },
    // download.js pipes into res; we only need it not to explode.
    on() {}, once() {}, emit() {}, write() { return true; },
  };
  Object.defineProperty(res, 'json', {
    get() { try { return JSON.parse(this.body); } catch { return null; } },
  });
  return res;
}

function mockReq(method, url, { body, headers } = {}) {
  const u = new URL(url, 'http://localhost');
  return {
    method,
    url: u.pathname + u.search,
    query: Object.fromEntries(u.searchParams.entries()),
    headers: Object.assign({ 'x-forwarded-for': '203.0.113.' + (1 + Math.floor(Math.random() * 250)) }, headers),
    body,
    socket: { remoteAddress: '203.0.113.1' },
    [Symbol.asyncIterator]: async function* () {},
  };
}

let admin, secretHandler, downloadHandler, configHandler, adminGalleries;
let publicGallery, privateGallery;

before(async () => {
  if (!CONFIGURED) return;
  ({ adminClient: admin } = await import('../api/_lib/supabase.js'));
  admin = admin();
  secretHandler   = (await import('../api/galleries/secret.js')).default;
  downloadHandler = (await import('../api/download.js')).default;
  configHandler   = (await import('../api/config.js')).default;
  adminGalleries  = (await import('../api/admin/galleries.js')).default;

  // A throwaway private gallery with one photo.
  const { data: g, error } = await admin
    .from('galleries')
    .insert({
      title: 'TEST — automated',
      slug: 'test-automated-' + Date.now(),
      visibility: 'private',
      description: 'Created by test/api.test.mjs',
    })
    .select('*')
    .single();
  if (error) throw error;
  privateGallery = g;

  await admin.from('media').insert({
    gallery_id: g.id,
    kind: 'photo',
    drive_file_id: '1xWT9-DpGniKjnfl1lPA8A4-aiNvJDejL',
    sort_order: 0,
  });

  const { data: pub } = await admin
    .from('galleries').select('*').eq('visibility', 'public').limit(1).single();
  publicGallery = pub;
});

after(async () => {
  if (!CONFIGURED || !privateGallery) return;
  await admin.from('galleries').delete().eq('id', privateGallery.id);
});

test('config exposes only public values', { skip: !CONFIGURED }, async () => {
  const res = mockRes();
  await configHandler(mockReq('GET', '/api/config'), res);
  assert.equal(res.statusCode, 200);
  const body = res.json;
  assert.ok(body.supabaseUrl);
  // The service role key must never appear in a public response.
  assert.ok(!JSON.stringify(body).includes(process.env.SUPABASE_SERVICE_ROLE_KEY));
});

test('a correct secret opens the private gallery, no sign-in', { skip: !CONFIGURED }, async () => {
  const res = mockRes();
  await secretHandler(mockReq('GET', `/api/galleries/secret?s=${privateGallery.secret_slug}`), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.gallery.id, privateGallery.id);
  assert.equal(res.json.gallery.media.length, 1);
  // Thumbnails must come back as usable image URLs, not raw Drive ids.
  const m = res.json.gallery.media[0];
  assert.match(m.thumb, /^https:\/\/lh3\.googleusercontent\.com\/d\//);
  assert.match(m.thumbFallback, /^https:\/\/drive\.google\.com\/thumbnail\?id=/);
});

test('a wrong secret is a plain 404 that leaks nothing', { skip: !CONFIGURED }, async () => {
  const res = mockRes();
  await secretHandler(mockReq('GET', '/api/galleries/secret?s=totally-made-up-secret'), res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.json.error, 'Gallery not found.');
});

test('link_access_enabled=false makes the secret alone insufficient', { skip: !CONFIGURED }, async () => {
  await admin.from('galleries').update({ link_access_enabled: false }).eq('id', privateGallery.id);
  try {
    const res = mockRes();
    await secretHandler(mockReq('GET', `/api/galleries/secret?s=${privateGallery.secret_slug}`), res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json.requiresLogin, true);
  } finally {
    await admin.from('galleries').update({ link_access_enabled: true }).eq('id', privateGallery.id);
  }
});

test('regenerating the secret kills the old link', { skip: !CONFIGURED }, async () => {
  const oldSecret = privateGallery.secret_slug;
  const newSecret = 'test-rotated-' + Date.now();
  await admin.from('galleries').update({ secret_slug: newSecret }).eq('id', privateGallery.id);

  const res = mockRes();
  await secretHandler(mockReq('GET', `/api/galleries/secret?s=${oldSecret}`), res);
  assert.equal(res.statusCode, 404);

  const res2 = mockRes();
  await secretHandler(mockReq('GET', `/api/galleries/secret?s=${newSecret}`), res2);
  assert.equal(res2.statusCode, 200);

  privateGallery.secret_slug = newSecret;
});

test('admin routes reject callers with no token', { skip: !CONFIGURED }, async () => {
  const res = mockRes();
  await adminGalleries(mockReq('GET', '/api/admin/galleries'), res);
  assert.equal(res.statusCode, 401);
});

test('admin routes reject a forged bearer token', { skip: !CONFIGURED }, async () => {
  const res = mockRes();
  await adminGalleries(
    mockReq('GET', '/api/admin/galleries', { headers: { authorization: 'Bearer not.a.real.token' } }),
    res
  );
  assert.equal(res.statusCode, 401);
});

test('the service role key is not accepted as a user token', { skip: !CONFIGURED }, async () => {
  // Belt and braces: even the all-powerful key shouldn't authenticate a *user*.
  const res = mockRes();
  await adminGalleries(
    mockReq('GET', '/api/admin/galleries', {
      headers: { authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY },
    }),
    res
  );
  assert.equal(res.statusCode, 401);
});

test('downloads on a private gallery are refused without the secret', { skip: !CONFIGURED }, async () => {
  const { data: m } = await admin
    .from('media').select('id').eq('gallery_id', privateGallery.id).limit(1).single();

  const res = mockRes();
  await downloadHandler(mockReq('GET', `/api/download?m=${m.id}`), res);
  assert.equal(res.statusCode, 403);
});

test('the rate limiter actually blocks', { skip: !CONFIGURED }, async () => {
  const { consume, LIMITS } = await import('../api/_lib/ratelimit.js');
  const key = 'unit-test-' + Date.now();
  const limit = LIMITS.signup.limit;

  for (let i = 0; i < limit; i++) {
    const r = await consume('signup', key);
    assert.equal(r.allowed, true, `call ${i + 1} should be allowed`);
  }
  const blocked = await consume('signup', key);
  assert.equal(blocked.allowed, false, 'the call past the limit should be blocked');
});
