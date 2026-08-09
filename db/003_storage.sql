-- ═══════════════════════════════════════════════════════════════════════════
-- Storage bucket for direct uploads.
--
-- Google Drive links are the main way photos get in now, but the admin panel
-- also keeps its drag-and-drop uploader for the occasional file that isn't in
-- Drive. Those land here.
--
-- The bucket is PUBLIC, deliberately and for the same reason it always was:
-- a gallery's privacy comes from whether it is listed and who has the link,
-- not from the image bytes being locked down. Drive-hosted photos work exactly
-- the same way. See the note at the top of db/001_schema.sql.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-photos',
  'gallery-photos',
  true,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- Anyone may read: the bucket is public.
drop policy if exists "gallery photos are publicly readable" on storage.objects;
create policy "gallery photos are publicly readable" on storage.objects
  for select using (bucket_id = 'gallery-photos');

-- Only admins may add, replace or remove files.
drop policy if exists "admins manage gallery photos" on storage.objects;
create policy "admins manage gallery photos" on storage.objects
  for all
  using (bucket_id = 'gallery-photos' and public.is_admin())
  with check (bucket_id = 'gallery-photos' and public.is_admin());
