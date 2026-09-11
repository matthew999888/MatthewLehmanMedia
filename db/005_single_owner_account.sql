-- ═══════════════════════════════════════════════════════════════════════════
-- Single-owner access.
--
-- This site has exactly one account: the owner's. Signup was removed from
-- login.html and api/auth/signup.js was deleted, but neither of those stops
-- anyone calling Supabase's auth endpoint directly with the public anon key,
-- which is all it takes to create a user. The trigger below is the part that
-- actually enforces it — every route into auth.users hits the same wall.
--
-- Email confirmation is moot as a result and is not used: the owner's account
-- is confirmed directly.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.only_owner_may_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if lower(coalesce(new.email, '')) is distinct from 'lehmanmatthew0@gmail.com' then
    raise exception 'Account creation is disabled on this site'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists block_other_signups on auth.users;
create trigger block_other_signups
  before insert on auth.users
  for each row execute function public.only_owner_may_signup();
