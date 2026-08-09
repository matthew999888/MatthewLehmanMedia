// Small request/response helpers shared by every route.

export function json(res, status, body, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // API responses are per-caller; never let a CDN hold on to them.
  res.setHeader('Cache-Control', 'no-store');
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function ok(res, body = {}) {
  return json(res, 200, { ok: true, ...body });
}

export function fail(res, status, message, extra) {
  return json(res, status, { ok: false, error: message, ...(extra || {}) });
}

// Guard the HTTP verb. Returns false when it has already answered the request.
export function methodIs(req, res, ...allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  fail(res, 405, `Method ${req.method} not allowed`);
  return false;
}

// Vercel parses JSON bodies for us, but `vercel dev` and raw invocations don't
// always, so handle both shapes.
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export function query(req) {
  if (req.query) return req.query;
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

// Trim and cap a free-text field so nothing unbounded reaches the database.
export function text(value, maxLength) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
