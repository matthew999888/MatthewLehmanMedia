-- ═══════════════════════════════════════════════════════════════════════
-- Matthew Lehman Media — Accounts, Private Galleries & Access Control
-- Run in Supabase SQL Editor. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- PROFILES  (one row per signed-up user)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  display_name   text,
  is_super_admin boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up (email or Google)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- GALLERIES  (extended: visibility + owner)
-- ─────────────────────────────────────────────
create table if not exists public.galleries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text default '',
  cover_url   text,
  cover_path  text,
  visibility  text not null default 'public' check (visibility in ('public','private')),
  owner_id    uuid references public.profiles(id),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.galleries add column if not exists visibility text not null default 'public';
alter table public.galleries add column if not exists owner_id uuid references public.profiles(id);
alter table public.galleries add column if not exists cover_path text;

-- ─────────────────────────────────────────────
-- GALLERY PHOTOS
-- ─────────────────────────────────────────────
create table if not exists public.gallery_photos (
  id           uuid primary key default gen_random_uuid(),
  gallery_id   uuid not null references public.galleries(id) on delete cascade,
  url          text,
  storage_path text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists gallery_photos_gallery_id_idx on public.gallery_photos(gallery_id);

-- ─────────────────────────────────────────────
-- GALLERY ACCESS  (who can view/manage a private gallery)
--   role = 'viewer'  → can view the gallery
--   role = 'manager' → can also grant/revoke 'viewer' access for that gallery
-- ─────────────────────────────────────────────
create table if not exists public.gallery_access (
  id         uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('viewer','manager')),
  created_at timestamptz not null default now(),
  unique(gallery_id, user_id)
);
create index if not exists gallery_access_gallery_idx on public.gallery_access(gallery_id);
create index if not exists gallery_access_user_idx on public.gallery_access(user_id);

-- ─────────────────────────────────────────────
-- HELPER FUNCTIONS (security definer → safe to call from RLS
-- without recursive-policy issues)
-- ─────────────────────────────────────────────
create or replace function public.is_super_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = uid), false);
$$;

create or replace function public.has_gallery_access(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.gallery_access where gallery_id = gid and user_id = uid);
$$;

create or replace function public.is_gallery_manager(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists(select 1 from public.galleries where id = gid and owner_id = uid)
    or exists(select 1 from public.gallery_access where gallery_id = gid and user_id = uid and role = 'manager')
    or public.is_super_admin(uid);
$$;

create or replace function public.can_view_gallery(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.galleries g
    where g.id = gid and (
      g.visibility = 'public'
      or g.owner_id = uid
      or public.is_super_admin(uid)
      or public.has_gallery_access(gid, uid)
    )
  );
$$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.gallery_access enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select using (auth.uid() = id or public.is_super_admin(auth.uid()));

drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles
  for update using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

drop policy if exists "galleries read" on public.galleries;
create policy "galleries read" on public.galleries
  for select using (
    visibility = 'public'
    or auth.uid() = owner_id
    or public.is_super_admin(auth.uid())
    or public.has_gallery_access(id, auth.uid())
  );

drop policy if exists "galleries admin insert" on public.galleries;
create policy "galleries admin insert" on public.galleries
  for insert with check (public.is_super_admin(auth.uid()));

drop policy if exists "galleries admin update" on public.galleries;
create policy "galleries admin update" on public.galleries
  for update using (public.is_super_admin(auth.uid()) or auth.uid() = owner_id)
  with check (public.is_super_admin(auth.uid()) or auth.uid() = owner_id);

drop policy if exists "galleries admin delete" on public.galleries;
create policy "galleries admin delete" on public.galleries
  for delete using (public.is_super_admin(auth.uid()));

drop policy if exists "photos read" on public.gallery_photos;
create policy "photos read" on public.gallery_photos
  for select using (public.can_view_gallery(gallery_id, auth.uid()));

drop policy if exists "photos admin write" on public.gallery_photos;
create policy "photos admin write" on public.gallery_photos
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

drop policy if exists "access read" on public.gallery_access;
create policy "access read" on public.gallery_access
  for select using (
    public.is_super_admin(auth.uid())
    or public.is_gallery_manager(gallery_id, auth.uid())
    or user_id = auth.uid()
  );

drop policy if exists "access insert" on public.gallery_access;
create policy "access insert" on public.gallery_access
  for insert with check (
    public.is_super_admin(auth.uid())
    or (public.is_gallery_manager(gallery_id, auth.uid()) and role = 'viewer')
  );

drop policy if exists "access update" on public.gallery_access;
create policy "access update" on public.gallery_access
  for update using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "access delete" on public.gallery_access;
create policy "access delete" on public.gallery_access
  for delete using (
    public.is_super_admin(auth.uid())
    or public.is_gallery_manager(gallery_id, auth.uid())
  );

-- ─────────────────────────────────────────────
-- STORAGE — PRIVATE bucket. Nothing is publicly guessable; every image
-- URL used on the site is a short-lived signed URL generated after an
-- access check, so private galleries are actually private.
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('gallery-photos', 'gallery-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "storage read with access" on storage.objects;
create policy "storage read with access" on storage.objects
  for select using (
    bucket_id = 'gallery-photos'
    and public.can_view_gallery((storage.foldername(name))[1]::uuid, auth.uid())
  );

drop policy if exists "storage admin insert" on storage.objects;
create policy "storage admin insert" on storage.objects
  for insert with check (bucket_id = 'gallery-photos' and public.is_super_admin(auth.uid()));

drop policy if exists "storage admin update" on storage.objects;
create policy "storage admin update" on storage.objects
  for update using (bucket_id = 'gallery-photos' and public.is_super_admin(auth.uid()));

drop policy if exists "storage admin delete" on storage.objects;
create policy "storage admin delete" on storage.objects
  for delete using (bucket_id = 'gallery-photos' and public.is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────
-- keep updated_at fresh on galleries
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists galleries_set_updated_at on public.galleries;
create trigger galleries_set_updated_at
  before update on public.galleries
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- AFTER RUNNING THIS FILE:
--   1. Authentication → Providers → Email: make sure "Confirm email" is ON.
--   2. Authentication → Providers → Google: enable it and paste your
--      Google OAuth Client ID + Secret (see README-SETUP.md for how to
--      get these from Google Cloud Console).
--   3. Authentication → URL Configuration: set Site URL to your real
--      domain, and add it (plus your Vercel preview URL) under
--      Redirect URLs.
--   4. Make yourself super admin — after you sign up once through
--      login.html, run this (swap in your email):
--         update public.profiles set is_super_admin = true
--         where email = 'you@example.com';
-- ═══════════════════════════════════════════════════════════════════════
