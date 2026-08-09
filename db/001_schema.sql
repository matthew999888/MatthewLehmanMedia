-- ═══════════════════════════════════════════════════════════════════════════
-- Matthew Lehman Media — full schema
-- Target project: pexqzghhjiwvvxbiirkr
--
-- Safe to re-run: every statement is idempotent.
--
-- Visibility model
-- ────────────────
--   public   → listed on the gallery grid, readable by anyone.
--   private  → NOT listed, and reachable two independent ways at once:
--                a) the random secret link /g/<secret_slug>, no login needed
--                   (this is what you email out), served by the API using the
--                   service role — the secret is never exposed to RLS; and
--                b) the "Your Galleries" section, for any signed-in user who
--                   has a gallery_access row.
--
--   link_access_enabled = false turns off (a) for one gallery, so its secret
--   link starts demanding sign-in + a grant. Regenerating secret_slug kills
--   every link already sent.
--
-- NOTE ON PRIVACY: media are Google Drive files shared "anyone with the link".
-- Those URLs work for whoever holds them regardless of what this database
-- says. Treat "private" as unlisted, not as secure.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;
create extension if not exists citext;


-- ───────────────────────────────────────────────────────────────────────────
-- profiles — mirrors auth.users, adds the admin flag
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext not null unique,
  full_name   text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);


-- ───────────────────────────────────────────────────────────────────────────
-- categories
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        citext not null unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);


-- ───────────────────────────────────────────────────────────────────────────
-- galleries
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.galleries (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  slug                 text not null unique,
  description          text,
  cover_url            text,
  visibility           text not null default 'public'
                         check (visibility in ('public', 'private')),
  -- URL-safe random secret. 18 bytes → 24 base64url chars.
  secret_slug          text not null unique
                         default replace(replace(encode(gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'),
  link_access_enabled  boolean not null default true,
  downloads_enabled    boolean not null default true,
  pixieset_url         text,
  shoot_date           date,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists galleries_visibility_sort_idx
  on public.galleries (visibility, sort_order);


-- ───────────────────────────────────────────────────────────────────────────
-- media — photos AND videos (replaces the old gallery_photos)
--
-- Either drive_file_id (a Google Drive file) or url (any other direct URL)
-- must be present. Thumbnails/preview/download URLs are derived from
-- drive_file_id in api/_lib/drive.js rather than stored.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.media (
  id             uuid primary key default gen_random_uuid(),
  gallery_id     uuid not null references public.galleries(id) on delete cascade,
  kind           text not null default 'photo' check (kind in ('photo', 'video')),
  drive_file_id  text,
  url            text,
  thumb_url      text,
  storage_path   text,
  caption        text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint media_has_a_source check (
    drive_file_id is not null or url is not null or storage_path is not null
  )
);

create index if not exists media_gallery_sort_idx
  on public.media (gallery_id, sort_order);


-- ───────────────────────────────────────────────────────────────────────────
-- gallery_categories — join
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.gallery_categories (
  gallery_id  uuid not null references public.galleries(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (gallery_id, category_id)
);

create index if not exists gallery_categories_category_idx
  on public.gallery_categories (category_id);


-- ───────────────────────────────────────────────────────────────────────────
-- gallery_access — grants a private gallery to a person, by email.
--
-- email is always set; user_id is filled in the moment an account with that
-- email exists. That is what makes pre-granting work: grant access to someone
-- who has never signed up, and it activates by itself when they confirm.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.gallery_access (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references public.galleries(id) on delete cascade,
  email       citext not null,
  user_id     uuid references public.profiles(id) on delete cascade,
  granted_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (gallery_id, email)
);

create index if not exists gallery_access_user_idx  on public.gallery_access (user_id);
create index if not exists gallery_access_email_idx on public.gallery_access (email);


-- ───────────────────────────────────────────────────────────────────────────
-- rate_limits — fixed-window counters. No Redis, no extra vendor.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);


-- ───────────────────────────────────────────────────────────────────────────
-- email_log / audit_log
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  to_email    citext not null,
  kind        text not null,
  gallery_id  uuid references public.galleries(id) on delete set null,
  sent_by     uuid references public.profiles(id) on delete set null,
  resend_id   text,
  error       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb,
  created_at  timestamptz not null default now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Keep galleries.updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists galleries_touch_updated_at on public.galleries;
create trigger galleries_touch_updated_at
  before update on public.galleries
  for each row execute function public.touch_updated_at();


-- New auth user → profile row, and claim any access granted to that email
-- before they existed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update set email = excluded.email;

  update public.gallery_access
     set user_id = new.id
   where email = new.email
     and user_id is distinct from new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email changes should follow the account.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
    update public.gallery_access set user_id = new.id where email = new.email;
    update public.gallery_access set user_id = null
      where user_id = new.id and email <> new.email;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();


-- Is the current caller an admin? Used by policies.
-- SECURITY DEFINER so that reading profiles from inside a profiles policy
-- cannot recurse.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;


-- Can the caller see this gallery? public, or admin, or granted.
create or replace function public.can_view_gallery(g_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.galleries g
     where g.id = g_id
       and (
         g.visibility = 'public'
         or public.is_admin()
         or exists (
           select 1 from public.gallery_access ga
            where ga.gallery_id = g.id
              and ga.user_id = auth.uid()
              and auth.uid() is not null
         )
       )
  );
$$;


-- Atomic fixed-window rate limit. Returns true when the call is allowed.
--
-- Called only by the service role from api/_lib/ratelimit.js. One upsert, no
-- read-then-write race: the counter is incremented and compared in the same
-- statement.
create or replace function public.consume_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  -- Floor now() to the start of the current window.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
    do update set count = rl.count + 1
  returning rl.count into v_count;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;


-- Housekeeping for the counter table. Call from a cron if you like; nothing
-- breaks if you never do, the rows are tiny.
create or replace function public.prune_rate_limits()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- Every table below has RLS enabled. Tables with no policy at all are
-- therefore readable by nobody except the service role — that is deliberate
-- for rate_limits, email_log and audit_log.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.galleries          enable row level security;
alter table public.media              enable row level security;
alter table public.gallery_categories enable row level security;
alter table public.gallery_access     enable row level security;
alter table public.rate_limits        enable row level security;
alter table public.email_log          enable row level security;
alter table public.audit_log          enable row level security;


-- ── profiles ───────────────────────────────────────────────────────────────
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());


-- ── categories — world readable, admin writable ────────────────────────────
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());


-- ── galleries ──────────────────────────────────────────────────────────────
-- Anonymous callers see public galleries only. A private gallery is invisible
-- to the anon key entirely; the secret link is served by the API with the
-- service role instead. This is the fix for the old behaviour, where any
-- unfiltered anon query returned every private gallery.
drop policy if exists galleries_select_visible on public.galleries;
create policy galleries_select_visible on public.galleries
  for select using (
    visibility = 'public'
    or public.is_admin()
    or (
      auth.uid() is not null
      and exists (
        select 1 from public.gallery_access ga
         where ga.gallery_id = galleries.id
           and ga.user_id = auth.uid()
      )
    )
  );

drop policy if exists galleries_admin_write on public.galleries;
create policy galleries_admin_write on public.galleries
  for all using (public.is_admin()) with check (public.is_admin());


-- ── media ──────────────────────────────────────────────────────────────────
drop policy if exists media_select_visible on public.media;
create policy media_select_visible on public.media
  for select using (public.can_view_gallery(gallery_id));

drop policy if exists media_admin_write on public.media;
create policy media_admin_write on public.media
  for all using (public.is_admin()) with check (public.is_admin());


-- ── gallery_categories ─────────────────────────────────────────────────────
drop policy if exists gallery_categories_select_visible on public.gallery_categories;
create policy gallery_categories_select_visible on public.gallery_categories
  for select using (public.can_view_gallery(gallery_id));

drop policy if exists gallery_categories_admin_write on public.gallery_categories;
create policy gallery_categories_admin_write on public.gallery_categories
  for all using (public.is_admin()) with check (public.is_admin());


-- ── gallery_access — you can see your own grants; admins see all ───────────
drop policy if exists gallery_access_select_own on public.gallery_access;
create policy gallery_access_select_own on public.gallery_access
  for select using (
    (auth.uid() is not null and user_id = auth.uid()) or public.is_admin()
  );

drop policy if exists gallery_access_admin_write on public.gallery_access;
create policy gallery_access_admin_write on public.gallery_access
  for all using (public.is_admin()) with check (public.is_admin());


-- ── rate_limits / email_log / audit_log ────────────────────────────────────
-- No policies on purpose: service role only.
-- audit_log and email_log get an admin read so the dashboard can show history.
drop policy if exists email_log_admin_select on public.email_log;
create policy email_log_admin_select on public.email_log
  for select using (public.is_admin());

drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log
  for select using (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS
--
-- Keep the rate limiter off the public API surface entirely — only the
-- service role may spend a token.
-- ═══════════════════════════════════════════════════════════════════════════
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.prune_rate_limits() from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.prune_rate_limits() to service_role;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.can_view_gallery(uuid) to anon, authenticated, service_role;
