-- PXLB v1 onboarding gate: flag on profiles.
-- Deploy order: apply this migration (column + backfill + trigger) BEFORE app code that redirects to /welcome.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Legacy members are done; do not send them to /welcome.
update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
  explicit_username text;
  base text;
  candidate text;
  suffix int := 0;
  meta_name text;
  completed_at timestamptz := null;
  reserved text[] := array[
    'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
    'login', 'me', 'pxlb', 'register', 'settings', 'space', 'thecommons', 'u',
    'welcome'
  ];
begin
  -- App email register sets username in metadata. Google may send preferred_username —
  -- only the app field marks onboarding complete.
  explicit_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  explicit_username := regexp_replace(explicit_username, '[^a-z0-9_]', '', 'g');

  requested := lower(coalesce(
    nullif(explicit_username, ''),
    new.raw_user_meta_data ->> 'preferred_username',
    ''
  ));
  requested := regexp_replace(requested, '[^a-z0-9_]', '', 'g');

  if requested ~ '^[a-z0-9_]{3,20}$'
     and requested <> all (reserved)
  then
    candidate := requested;
  else
    base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
    if char_length(base) < 3 or base = any (reserved) then
      base := 'member';
    elsif char_length(base) > 16 then
      base := substr(base, 1, 16);
    end if;

    candidate := base;
    while exists (select 1 from public.profiles where lower(username) = candidate)
       or candidate = any (reserved)
    loop
      suffix := suffix + 1;
      candidate := substr(base, 1, greatest(3, 20 - char_length(suffix::text))) || suffix::text;
    end loop;
  end if;

  if explicit_username ~ '^[a-z0-9_]{3,20}$'
     and explicit_username <> all (reserved)
  then
    completed_at := now();
  end if;

  meta_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  if meta_name is not null and char_length(meta_name) > 50 then
    meta_name := substr(meta_name, 1, 50);
  end if;

  insert into public.profiles (id, username, display_name, onboarding_completed_at)
  values (new.id, candidate, meta_name, completed_at);

  return new;
end;
$$;
