# Your site — accounts, private galleries & deployment

Everything is already connected to a live Supabase project (`lehman-gallery`).
The database, storage bucket, and security rules are set up and running.
What's left is a few things only you can do (Google login, making yourself
admin, and putting the site online).

## What you now have

- **`login.html`** — public sign-in/sign-up page. Email+password (with
  verification) and "Continue with Google."
- **`gallery.html`** — public gallery. Shows public galleries to everyone;
  shows private galleries only to people who've been given access.
- **`admin.html`** — private dashboard. Sign in here to create galleries,
  upload photos (drag & drop), set a gallery to Public or Private, and
  control who can see each private gallery.
- Photos live in a **private** storage bucket — for a private gallery, the
  image files themselves aren't publicly guessable, not just the page.

## How access works

- **Public gallery** → shows on `gallery.html` for anyone, signed in or not.
- **Private gallery** → invisible to everyone except:
  - you (the super admin),
  - the gallery's owner,
  - anyone you've added under "Who Can Access This Gallery" in `admin.html`.
- Two roles for people you grant access to:
  - **Viewer** — can see the gallery.
  - **Manager** — can see it *and* add/remove other viewers for that one
    gallery (they can't touch other galleries or upload photos).
- **Super admins** (toggled in the Users tab of `admin.html`) can do
  everything, everywhere.

## One-time setup steps

### 1. Make yourself super admin
1. Go to `login.html` on your site and create an account with your own email.
2. Check your email and click the verification link.
3. In the Supabase dashboard → SQL Editor, run:
   ```sql
   update public.profiles set is_super_admin = true where email = 'you@example.com';
   ```
4. Go to `admin.html` and sign in — you'll now see the full dashboard
   (Galleries + Users tabs, New Gallery, uploads, everything).

### 2. Turn on email verification
Supabase dashboard → **Authentication → Providers → Email** → make sure
**Confirm email** is switched on (it's on by default for new projects).

### 3. Set up Google Sign-In
Google sign-in needs a few minutes in Google's own console since only you
can create that app under your Google account:
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
  it's safe to commit to GitHub. Access control is enforced by the
  database rules (RLS), not by hiding that key.
- `admin.html` isn't linked from your public nav, but it *is* still a
  public URL — that's fine, since only accounts with `is_super_admin` (or
  gallery-manager access) can actually do anything there; everyone else
  just sees a login form they can't get past.
- If you ever want to rotate the Supabase key (e.g. you think it leaked in
  a way that matters, though it usually doesn't since it's meant to be
  public), get a fresh one from Supabase → Project Settings → API and
  swap it into all three HTML files.

## Notes / known limitations

- Photo URLs for private galleries are short-lived signed links (valid ~1
  hour) — if someone leaves a private gallery open in a tab for hours,
  images may need a page refresh to keep loading.
- Only super admins can upload/delete photos or edit gallery details.
  Managers can only add/remove viewer access for the galleries they manage.
- There are a few pre-existing, unrelated empty tables in this Supabase
  project (`albums`, `images`, `site_settings`) left over from earlier
  scaffolding, with permissive write policies. They aren't used by this
  site — worth deleting if you don't need them, just to keep things tidy.
