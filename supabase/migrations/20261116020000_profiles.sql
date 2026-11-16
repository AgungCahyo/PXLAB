-- Phase 2: member profiles, unique usernames, RLS.
-- Admin role cannot be self-assigned. Promote with a trusted SQL operation:
--   update public.profiles set role = 'admin' where username = 'chosen_username';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  bio text,
  avatar_url text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_username_reserved check (
    username not in (
      'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
      'login', 'me', 'register', 'settings', 'space', 'thecommons', 'u'
    )
  ),
  constraint profiles_role_allowed check (role in ('member', 'admin')),
  constraint profiles_display_name_len check (
    display_name is null or char_length(display_name) between 1 and 50
  ),
  constraint profiles_bio_len check (bio is null or char_length(bio) <= 280)
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
  base text;
  candidate text;
  suffix int := 0;
  meta_name text;
begin
  requested := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if requested ~ '^[a-z0-9_]{3,20}$'
     and requested not in (
       'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
       'login', 'me', 'register', 'settings', 'space', 'thecommons', 'u'
     )
  then
    -- Requested names are inserted as-is. Duplicate usernames fail the unique index
    -- so registration is rejected instead of silently renaming the member.
    candidate := requested;
  else
    base := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    if char_length(base) < 3
       or base in (
         'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
         'login', 'me', 'register', 'settings', 'space', 'thecommons', 'u'
       )
    then
      base := 'member';
    elsif char_length(base) > 16 then
      base := substr(base, 1, 16);
    end if;

    candidate := base;
    while exists (select 1 from public.profiles where lower(username) = candidate)
       or candidate in (
         'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
         'login', 'me', 'register', 'settings', 'space', 'thecommons', 'u'
       )
    loop
      suffix := suffix + 1;
      candidate := substr(base, 1, greatest(3, 20 - char_length(suffix::text))) || suffix::text;
    end loop;
  end if;

  meta_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if meta_name is not null and char_length(meta_name) > 50 then
    meta_name := substr(meta_name, 1, 50);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, meta_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy profiles_select_public
  on public.profiles
  for select
  using (true);

-- Member A can update Member A only. Member B's row fails the using clause.
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
-- role is intentionally omitted so a member cannot self-assign admin.
grant update (username, display_name, bio, avatar_url, updated_at)
  on table public.profiles to authenticated;
