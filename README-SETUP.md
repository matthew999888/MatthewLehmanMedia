# Matthew Lehman Media — how the site works

Four pages, a small backend, and a Supabase database. This file covers what
each part does, the setup steps only you can do, and how to run it locally.

---

## The pages

| Page | What it's for |
|---|---|
| `index.html` | The main site. Contact form now posts to your own backend. |
| `gallery.html` | Public gallery grid, plus **Your Galleries** for signed-in clients. |
| `login.html` | Owner sign-in only. Not linked from the site; account creation is off. |
| `admin.html` | Your dashboard. Not linked from anywhere — bookmark it. |
| `/g/<link>` | A private gallery opened by its secret link. No account needed. |

`api/` holds the backend — small serverless functions Vercel runs for you.
`db/` holds the database setup. Neither needs touching day to day.

---

## How galleries work

Every gallery is either **public** or **private**.

**Public** — listed on the gallery page for everyone.

**Private** — not listed anywhere, and reachable two ways at once:

1. **Its private link** (`yoursite.com/g/AbC123…`). Anyone holding that link
   opens the gallery. No account, no password. This is what you email to
   parents and coaches, and it's the normal way clients see their photos.
2. ~~**Their account.**~~ No longer available: the site has exactly one
   account, yours. Private links are how clients see their photos.

Both work at the same time — you don't have to choose. Signing in is purely a
convenience so a returning client finds everything in one place.

Two switches per gallery worth knowing:

- **Regenerate** (on the Private Link panel) mints a brand-new link and
  **instantly breaks every link you've already sent**. Use it if a link leaks.
- **Private link works without signing in** (in Edit Gallery) is on by default.
  Turn it off and the link alone stops working — visitors must sign in with an
  account you've granted. Only worth using for something genuinely sensitive.

You can grant access to someone **before they have an account**. The grant sits
waiting and activates by itself the moment they sign up with that email.

### One honest limitation

A "private" gallery is *unlisted*, not *secure*. The photos are Google Drive
files shared as "anyone with the link" — that Drive URL works for whoever has
it, no matter what this site says. Fine for client galleries. Don't use it for
anything that would actually matter if it got out.

---

## Adding photos and videos

Open a gallery → **Manage** → paste Google Drive links, one per line.

Any Drive link shape works — the share link, a `/preview` link, or an old
`thumbnail?id=…` URL. Duplicates are skipped. Anything unreadable is reported
rather than silently dropped.

**Each file must be shared as "Anyone with the link" in Drive**, or it won't
load for visitors. This is the single most common thing to get wrong.

- **Videos**: tick *These are videos* before adding. They get a play badge and
  open in Drive's player. If something comes in as the wrong type, the
  **Mark Video** / **Mark Photo** button on each tile fixes it.
- **Uploads**: the second tab still takes drag-and-drop files, stored in
  Supabase. Drive links are usually easier.
- **Downloads** go through `/api/download`, which checks permission, gives the
  file a real name, and rate-limits. Turn them off per gallery in Edit Gallery.

---

## Setup — the parts only you can do

Everything below degrades gracefully. Miss a step and that feature stays
switched off; the site keeps working.

### 1. The owner account — already done

There is exactly one account, `lehmanmatthew0@gmail.com`, confirmed and with
`profiles.is_admin` set. Sign in at `/login` and `/admin` lets you in.

Account creation is off in three places, deliberately:

- `login.html` has no signup form, and no page links to `/login` any more.
- `api/auth/signup.js` and `api/auth/resend-confirmation.js` are deleted.
- `db/005_single_owner_account.sql` puts a trigger on `auth.users` that
  refuses any other email. This is the one that actually matters — the first
  two only close the site's own doors, while the Supabase auth endpoint stays
  reachable with the public anon key.

To change the password, use Supabase → **Authentication → Users**. To allow a
second account one day, drop the trigger in `005` and restore the signup route.

### 2. Environment variables

Set these in Vercel → Project → Settings → Environment Variables. See
`.env.example` for the full annotated list.

| Variable | Needed for |
|---|---|
| `SUPABASE_URL` | everything |
| `SUPABASE_ANON_KEY` | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — private links, signup, admin writes |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | bot protection |
| `RESEND_API_KEY`, `RESEND_FROM` | all outgoing email |
| `OWNER_EMAIL` | where contact-form enquiries land |
| `SITE_URL` | building the links inside emails |

The service role key bypasses every security rule in the database. It belongs
in Vercel only — never in an HTML file, never in git.

### 3. Cloudflare Turnstile

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → Add site.
2. Add your domain. Widget mode **Managed** is fine.
3. Copy the **Site Key** and **Secret Key** into the two env vars above.

Leave them blank and the bot check is skipped — signup and the contact form
still work, just less protected.

### 4. Resend (email)

1. [resend.com](https://resend.com) → **Domains** → add `matthewlehmanmedia.com`
   and add the DNS records it gives you. Wait for **Verified**.
2. **API Keys** → create one → put it in `RESEND_API_KEY`.
3. Set `RESEND_FROM` to something at that domain, e.g.
   `Matthew Lehman Media <noreply@matthewlehmanmedia.com>`.

Until this is done: confirmation emails, password resets, "email this gallery",
and the contact form are all switched off and say so.

### 5. Pixieset

Open `gallery.html`, find `SHOP_LINK` near the top of the script, and paste
your shop URL. That's the site-wide default; any single gallery can override it
with its own Pixieset URL in **Edit Gallery**. Leave the placeholder and the
Shop button just doesn't appear.

---

## The database

The files in `db/` are the record of the schema, and are safe to re-run against
whichever Supabase project `SUPABASE_URL` points at:

| File | What it does |
|---|---|
| `001_schema.sql` | Tables, triggers, rate limiter, row-level security |
| `002_seed.sql` | The 13 starting galleries — **generated, don't hand-edit** |
| `003_storage.sql` | The upload bucket and its policies |
| `004_column_grants.sql` | Hides `secret_slug` from the public key |
| `005_single_owner_account.sql` | One account only — blocks every other signup |

Regenerate the seed from the fallback data in `gallery.html` with:

```bash
node db/generate-seed.mjs
```

Don't re-run `002_seed.sql` after you've curated those galleries in the admin
panel — it resets their photo lists back to what `gallery.html` says.

**Row-level security is on for every table.** Anonymous visitors can read
public galleries and nothing else — a private gallery cannot be reached with
the public key at all. Private links are resolved server-side instead, where
holding the secret is the proof. Admin writes are re-checked on the server on
every single request, never trusted from the browser.

---

## Rate limits

Counted in Postgres — no Redis, no extra bill. Current budgets live in
`api/_lib/ratelimit.js`:

| Action | Limit |
|---|---|
| Password reset | 3–5/hour |
| Opening a private link | 60 per 5 min per IP |
| Downloads | 300/hour per IP |
| Contact form | 5/hour per IP |

If the database is unreachable the limiter lets requests through rather than
taking the site down — Turnstile is the real gate on the sensitive routes.

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # then fill in the values
npx vercel dev
```

`vercel dev` is what runs the `/api` functions. Opening the HTML files
directly still shows the site, but anything needing the backend — private
links, signup, downloads — won't work.

---

## Deploying

Push to `main`. Vercel builds and deploys automatically.

After the first deploy with accounts enabled, set Supabase → Authentication →
**URL Configuration**: Site URL to your domain, and add your domain plus any
`*.vercel.app` preview URLs to Redirect URLs. Confirmation links bounce to the
wrong place otherwise.

`vercel.json` handles the `/g/<link>` rewrite, security headers, and the
content-security policy. If you ever add a script from a new domain, it needs
adding to the CSP there or the browser will block it.

---

## Notes

- The Supabase **anon key** in the page source is meant to be public. Security
  comes from the database rules, not from hiding it.
- `admin.html` and `/g/…` links are marked `noindex` so they stay out of Google.
- `FALLBACK_GALLERIES` in `gallery.html` is a safety net: if Supabase is ever
  unreachable, the page still shows those galleries instead of an empty grid.
- Every admin action is written to the `audit_log` table, and every email sent
  to `email_log`.
