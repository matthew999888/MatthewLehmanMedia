// One function fronting all six admin endpoints.
//
// Vercel's Hobby plan allows 12 Serverless Functions per deployment, and the
// six admin routes as separate files put this project at 13. They are folded
// into this dispatcher instead: the handlers themselves are untouched, they
// just live in api/_admin/ now, where the leading underscore keeps Vercel from
// counting each one as its own function.
//
// The URLs are unchanged — /api/admin/galleries still reaches galleries.js —
// so nothing in admin.html had to move with them.
//
// A Map, not an object literal: a plain object would resolve 'constructor' and
// '__proto__' up the prototype chain to something truthy that is not a handler,
// turning /api/admin/constructor into a 500 for anyone who asked, signed in or
// not. A Map only ever holds what was put in it.

import { fail } from '../_lib/http.js';

import access          from '../_admin/access.js';
import categories      from '../_admin/categories.js';
import galleries       from '../_admin/galleries.js';
import media           from '../_admin/media.js';
import sendGalleryLink from '../_admin/send-gallery-link.js';
import users           from '../_admin/users.js';

const ROUTES = new Map([
  ['access', access],
  ['categories', categories],
  ['galleries', galleries],
  ['media', media],
  ['send-gallery-link', sendGalleryLink],
  ['users', users],
]);

export default async function handler(req, res) {
  const route = ROUTES.get(String(req.query.action ?? ''));
  if (typeof route !== 'function') return fail(res, 404, 'Not found');
  return route(req, res);
}
