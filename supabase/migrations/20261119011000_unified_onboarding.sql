-- Unified identity onboarding: incomplete profiles + avatar_config.
-- New users (email + Google) get username=null and onboarding_completed_at=null.
-- Existing members keep usernames and completed onboarding (prior backfill).

alter table public.profiles
  add column if not exists avatar_config jsonb;

alter table public.profiles
  alter column username drop not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

alter table public.profiles drop constraint if exists profiles_username_reserved;
alter table public.profiles add constraint profiles_username_reserved
  check (
    username is null or username not in (
      'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
      'login', 'me', 'pxlb', 'register', 'settings', 'space', 'thecommons', 'u',
      'welcome'
    )
  );

drop index if exists public.profiles_username_lower_idx;
create unique index profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_name text;
begin
  -- Never invent a public username here. Identity is chosen on /welcome.
  meta_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  if meta_name is not null and char_length(meta_name) > 50 then
    meta_name := substr(meta_name, 1, 50);
  end if;

  insert into public.profiles (id, username, display_name, onboarding_completed_at, avatar_config)
  values (new.id, null, meta_name, null, null);

  return new;
end;
$$;

-- Column-level grants for onboarding writes (authenticated cannot touch role).
grant update (
  username,
  display_name,
  bio,
  avatar_url,
  avatar_config,
  onboarding_completed_at,
  updated_at
) on table public.profiles to authenticated;
