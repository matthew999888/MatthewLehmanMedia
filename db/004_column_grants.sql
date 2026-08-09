-- ═══════════════════════════════════════════════════════════════════════════
-- Hide secret_slug from the public API key.
--
-- Row-level security decides which ROWS a caller sees; it says nothing about
-- COLUMNS. So while a private gallery was correctly invisible to the anon key,
-- the secret link of every *public* gallery could still be read straight out
-- of the galleries table:
--
--   curl "$URL/rest/v1/galleries?select=secret_slug" -H "apikey: $ANON"
--
-- On its own that leaks little — those galleries are public anyway. The real
-- problem is later: flip one of them to private and its link is already in
-- someone's harvested list, and "regenerate" would be the only way back.
--
-- Column-level grants close it. PostgREST honours them, so secret_slug simply
-- stops being selectable with the public key. The admin panel still sees it,
-- because it goes through /api/admin/galleries on the service role.
-- ═══════════════════════════════════════════════════════════════════════════

revoke select on public.galleries from anon, authenticated;

grant select (
  id,
  slug,
  title,
  description,
  cover_url,
  visibility,
  link_access_enabled,
  downloads_enabled,
  pixieset_url,
  shoot_date,
  sort_order,
  created_at,
  updated_at
) on public.galleries to anon, authenticated;

-- Note the omission: secret_slug is deliberately not in that list.
