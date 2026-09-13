// Local dev server — a stand-in for `vercel dev`.
//
//   npm run dev            (this)
//   npm run dev:vercel     (the real thing, needs the Vercel CLI + a login)
//
// `vercel dev` needs the CLI installed globally and an interactive login, which
// makes "clone the repo and run it" a non-starter. This serves the same site
// from the same files: static pages with vercel.json's cleanUrls and rewrites,
// and the real handlers in /api invoked as plain Node functions.
//
// It is not a Vercel emulator. Headers, caching and rate-limit IPs are not
// reproduced. It exists so the pages and the API can be exercised locally.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// Mirrors the "rewrites" block in vercel.json.
function rewrite(pathname) {
  if (pathname === '/' ) return '/index.html';
  if (pathname === '/gallery') return '/gallery.html';
  if (pathname === '/login') return '/login.html';
  if (pathname === '/admin') return '/admin.html';
  if (pathname.startsWith('/g/')) return '/gallery.html';   // /g/:secret
  return pathname;
}

// Find the handler for an /api path, including one dynamic [segment].
// /api/admin/galleries -> api/admin/[action].js with query.action = 'galleries'
function resolveApi(pathname) {
  const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const direct = path.join(ROOT, ...parts) + '.js';
  if (fs.existsSync(direct)) return { file: direct, params: {} };

  const dir = path.join(ROOT, ...parts.slice(0, -1));
  const last = parts[parts.length - 1];
  if (!fs.existsSync(dir)) return null;
  const dynamic = fs.readdirSync(dir).find((f) => /^\[[^\]]+\]\.js$/.test(f));
  if (!dynamic) return null;
  const name = dynamic.slice(1, dynamic.indexOf(']'));
  return { file: path.join(dir, dynamic), params: { [name]: last } };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // ── /api ────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const hit = resolveApi(pathname);
    if (!hit) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    }
    // Fresh import each request so edits to a handler take effect on reload.
    const mod = await import(pathToFileURL(hit.file).href + `?t=${Date.now()}`);
    req.query = { ...Object.fromEntries(url.searchParams), ...hit.params };
    if (!req.headers['x-forwarded-for']) req.headers['x-forwarded-for'] = '127.0.0.1';
    try {
      await mod.default(req, res);
    } catch (err) {
      console.error(`  ${pathname} threw:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
      }
    }
    console.log(`  ${req.method} ${pathname} -> ${res.statusCode}`);
    return;
  }

  // ── static ──────────────────────────────────────────────────────────────
  const file = path.join(ROOT, rewrite(pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    console.log(`  ${req.method} ${pathname} -> 404`);
    return res.end('Not found');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  const has = (k) => (process.env[k] ? 'set' : 'MISSING');
  console.log(`\n  Matthew Lehman Media — dev server`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  SUPABASE_URL ................ ${has('SUPABASE_URL')}`);
  console.log(`  SUPABASE_ANON_KEY ........... ${has('SUPABASE_ANON_KEY')}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY ... ${has('SUPABASE_SERVICE_ROLE_KEY')}`);
  if (!process.env.SUPABASE_URL) {
    console.log(`\n  No .env.local — pages will fall back to FALLBACK_GALLERIES.`);
  }
  console.log('');
});
