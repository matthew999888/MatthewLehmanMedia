# Your site — galleries & deployment

Everything is already connected to a live Supabase project (`lehman-gallery`).
The database, storage bucket, and security rules are set up and running.
What's left is a few things only you can do (creating your admin login,
optionally Google sign-in, and putting the site online).

## What you now have

- **`gallery.html`** — the public gallery page. Shows every **public**
  gallery to everyone. A **private** gallery doesn't show up here, but the
  exact same page still opens it for anyone who has the direct link.
- **`admin.html`** — the only sign-in page on the whole site. Not linked
  from the public nav — bookmark it directly. Sign in here to create
  galleries, upload photos (drag & drop), set a gallery to Public or
  Private, and copy each gallery's direct link.
- There is **no public sign-up page**. The only way to get an account is
  you creating one by hand in the Supabase dashboard — see below.

## How access works

- **Public gallery** → shows on `gallery.html`'s grid for anyone, no
  sign-in required.
- **Private gallery** → doesn't show on the grid, but works exactly like
  an unlisted video: anyone with its direct link
  (`gallery.html#g-<gallery-id>`) can open and view it, no login wall.
  Copy that link anytime from the gallery's page in `admin.html`.
- **Admin account** → any account you create in Supabase can sign in at
  `admin.html` and has full access to every gallery: create, edit, delete,
  upload/remove photos, change Public/Private, and copy links. There are
  no separate roles or permission levels to manage.

## One-time setup steps

### 1. Create your admin account
1. Supabase dashboard → **Authentication → Users → Add user**. Set an
   email and password (turn off "Auto confirm" only if you want to send a
   real invite email instead).
2. Go to `admin.html` on your site and sign in with that email/password.
   You're in — no extra "make me admin" step needed, since every account
   is a full admin.

### 2. (Optional) Set up Google Sign-In
Only worth doing if you'd rather click "Continue with Google" than type a
password:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) →
   create a project (or use an existing one).
2. **APIs & Services → OAuth consent screen** — set it up for "External"
   users, add your site name and your email.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type: **Web application**.
4. In Supabase dashboard → **Authentication → Providers → Google** → copy
   the **Callback URL** shown there, and paste it into "Authorized redirect
   URIs" on the Google credential you just made.
5. Copy the **Client ID** and **Client Secret** Google gives you, paste them
   into the Supabase Google provider settings, and toggle it **on**.
6. Once you deploy the site (see below), also add your live domain under
   Supabase → **Authentication → URL Configuration → Redirect URLs** and
   set **Site URL** to your domain — otherwise Google login will bounce
   back to the wrong place.
7. In Supabase → **Authentication → Users**, your Google account still
   needs to exist as a user before (or right after) you sign in with it —
   signing in with Google the first time creates it automatically.

## Deploying: GitHub + Vercel

This is a good plan — it's the standard way to host a static site like
this one, and it's free at this scale.

1. **Create a GitHub repo** and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. **Import it into Vercel**: vercel.com → Add New → Project → pick your
   GitHub repo. No build settings needed — it's static HTML, Vercel will
   detect that automatically. Click Deploy.
3. **Update Supabase's allowed URLs**: once you have your `*.vercel.app`
   URL (and later your real domain), add both to Supabase → Authentication
   → URL Configuration → Redirect URLs, and set Site URL to your primary
   domain.
4. From then on, every `git push` to `main` auto-deploys.

A couple of things worth knowing:
- The Supabase **anon key** baked into these files is meant to be public —
  it's safe to commit to GitHub. Admin write access is enforced by the
  database rules (RLS) requiring a signed-in session, not by hiding that
  key.
- `admin.html` isn't linked from your public nav, but it *is* still a
  public URL — that's fine, since no one can do anything there without
  signing in, and there's no way to create an account except you doing it
  by hand in Supabase.
- Photos are stored in a **public** storage bucket. That's intentional:
  privacy for a gallery comes from whether its link is public (shown on
  the grid) or private (only shared directly), not from the image files
  themselves being locked down. Don't treat a "private" gallery as
  suitable for anything truly sensitive — treat it like an unlisted link.
- If you ever want to rotate the Supabase key (e.g. you think it leaked in
  a way that matters, though it usually doesn't since it's meant to be
  public), get a fresh one from Supabase → Project Settings → API and
  swap it into both `gallery.html` and `admin.html`.

## Upgrading from the older multi-account version

If this site previously had `login.html`, viewer accounts, and per-person
gallery access — that system has been removed. Re-run
`supabase-setup.sql`; it automatically drops the old `profiles` and
`gallery_access` tables and the `owner_id` column, and switches the photo
storage bucket from private (signed URLs) to public. Existing galleries
and photos are untouched, just re-pointed at the simpler model above.

## Notes / known limitations

- There are a few pre-existing, unrelated empty tables in this Supabase
  project (`albums`, `images`, `site_settings`) left over from earlier
  scaffolding, with permissive write policies. They aren't used by this
  site — worth deleting if you don't need them, just to keep things tidy.
