-- OAuth (Google) users often send full_name / name / preferred_username,
-- not the app's register fields. Derive display_name + username safely.
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
  reserved text[] := array[
    'admin', 'api', 'auth', 'commons', 'create', 'dashboard', 'explore',
    'login', 'me', 'pxlb', 'register', 'settings', 'space', 'thecommons', 'u'
  ];
begin
  requested := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'preferred_username',
    ''
  ));
  requested := regexp_replace(requested, '[^a-z0-9_]', '', 'g');

  if requested ~ '^[a-z0-9_]{3,20}$'
     and requested <> all (reserved)
  then
    -- Requested names are inserted as-is. Duplicate usernames fail the unique index
    -- so registration is rejected instead of silently renaming the member.
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

  meta_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  if meta_name is not null and char_length(meta_name) > 50 then
    meta_name := substr(meta_name, 1, 50);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, meta_name);

  return new;
end;
$$;
