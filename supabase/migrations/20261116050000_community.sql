-- Phase 5: comments, one appreciation reaction, reports, admin hide/restore.
-- Members cannot self-assign admin. Promote with trusted SQL:
--   update public.profiles set role = 'admin' where username = 'chosen_username';
-- Admin hide/restore runs through security definer functions, not client status updates.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Forks may only point at a published source. Grant the column now that Phase 5 uses it.
grant insert (forked_from) on table public.creations to authenticated;

create or replace function public.creations_validate_fork()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.forked_from is not null then
    if not exists (
      select 1 from public.creations
      where id = new.forked_from and status = 'published'
    ) then
      raise exception 'forked_from must be a published creation';
    end if;
  end if;
  return new;
end;
$$;

create trigger creations_validate_fork
  before insert on public.creations
  for each row
  execute function public.creations_validate_fork();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creation_id uuid not null references public.creations (id) on delete cascade,
  content text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint comments_content_len check (char_length(content) between 1 and 1000),
  constraint comments_status_allowed check (status in ('published', 'hidden'))
);

create index comments_creation_id_created_at_idx
  on public.comments (creation_id, created_at);
create index comments_user_id_created_at_idx
  on public.comments (user_id, created_at desc);

alter table public.comments enable row level security;

create policy comments_select_published
  on public.comments
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.creations c
      where c.id = comments.creation_id and c.status = 'published'
    )
  );

create policy comments_select_own
  on public.comments
  for select
  to authenticated
  using (user_id = auth.uid());

create policy comments_select_admin
  on public.comments
  for select
  to authenticated
  using (public.is_admin());

create policy comments_insert_own
  on public.comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'published'
    and exists (
      select 1 from public.creations c
      where c.id = creation_id and c.status = 'published'
    )
  );

create policy comments_delete_own
  on public.comments
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.comments from anon, authenticated;
grant select on table public.comments to anon, authenticated;
grant insert (user_id, creation_id, content) on table public.comments to authenticated;
grant delete on table public.comments to authenticated;

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creation_id uuid not null references public.creations (id) on delete cascade,
  reaction_type text not null default 'appreciate',
  created_at timestamptz not null default now(),
  constraint reactions_type_allowed check (reaction_type = 'appreciate'),
  constraint reactions_unique_member unique (user_id, creation_id)
);

create index reactions_creation_id_idx on public.reactions (creation_id);

alter table public.reactions enable row level security;

create policy reactions_select_published
  on public.reactions
  for select
  using (
    exists (
      select 1 from public.creations c
      where c.id = reactions.creation_id and c.status = 'published'
    )
  );

create policy reactions_insert_own
  on public.reactions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and reaction_type = 'appreciate'
    and exists (
      select 1 from public.creations c
      where c.id = creation_id and c.status = 'published'
    )
  );

create policy reactions_delete_own
  on public.reactions
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.reactions from anon, authenticated;
grant select on table public.reactions to anon, authenticated;
grant insert (user_id, creation_id, reaction_type) on table public.reactions to authenticated;
grant delete on table public.reactions to authenticated;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_target_type_allowed check (
    target_type in ('creation', 'comment', 'space_element')
  ),
  constraint reports_reason_allowed check (
    reason in ('spam', 'harassment', 'illegal', 'off_topic', 'other')
  ),
  constraint reports_status_allowed check (status in ('pending', 'reviewed', 'resolved')),
  constraint reports_details_len check (details is null or char_length(details) <= 500)
);

create index reports_status_created_at_idx on public.reports (status, created_at);
create index reports_reporter_id_created_at_idx on public.reports (reporter_id, created_at desc);
create unique index reports_pending_unique
  on public.reports (reporter_id, target_type, target_id)
  where status = 'pending';

alter table public.reports enable row level security;

create policy reports_select_own
  on public.reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

create policy reports_select_admin
  on public.reports
  for select
  to authenticated
  using (public.is_admin());

create policy reports_insert_own
  on public.reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

revoke all on table public.reports from anon, authenticated;
grant select on table public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details)
  on table public.reports to authenticated;

create or replace function public.reports_validate_target()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.target_type = 'creation' then
    if not exists (
      select 1 from public.creations
      where id = new.target_id and status = 'published'
    ) then
      raise exception 'invalid_target';
    end if;
  elsif new.target_type = 'comment' then
    if not exists (
      select 1 from public.comments c
      join public.creations cr on cr.id = c.creation_id
      where c.id = new.target_id
        and c.status = 'published'
        and cr.status = 'published'
    ) then
      raise exception 'invalid_target';
    end if;
  elsif new.target_type = 'space_element' then
    if not exists (
      select 1 from public.space_elements
      where id = new.target_id and status = 'active'
    ) then
      raise exception 'invalid_target';
    end if;
  else
    raise exception 'invalid_target';
  end if;
  return new;
end;
$$;

create trigger reports_validate_target
  before insert on public.reports
  for each row
  execute function public.reports_validate_target();

create or replace function public.admin_set_creation_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('draft', 'published', 'hidden') then
    raise exception 'invalid_status';
  end if;
  update public.creations
  set
    status = p_status,
    published_at = case
      when p_status = 'published' then coalesce(published_at, now())
      else published_at
    end
  where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

create or replace function public.admin_set_comment_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('published', 'hidden') then
    raise exception 'invalid_status';
  end if;
  update public.comments
  set status = p_status
  where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

create or replace function public.admin_set_space_element_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('active', 'hidden') then
    raise exception 'invalid_status';
  end if;
  update public.space_elements
  set status = p_status
  where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

create or replace function public.admin_set_report_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pending', 'reviewed', 'resolved') then
    raise exception 'invalid_status';
  end if;
  update public.reports
  set
    status = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function public.admin_set_creation_status(uuid, text) from public;
revoke all on function public.admin_set_comment_status(uuid, text) from public;
revoke all on function public.admin_set_space_element_status(uuid, text) from public;
revoke all on function public.admin_set_report_status(uuid, text) from public;
grant execute on function public.admin_set_creation_status(uuid, text) to authenticated;
grant execute on function public.admin_set_comment_status(uuid, text) to authenticated;
grant execute on function public.admin_set_space_element_status(uuid, text) to authenticated;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;
