-- B4: Artwork Conversation. Additive only — do not rewrite 20261116050000_community.sql.
-- One-level replies (parent_id), owner edit of content, published source read for pixel fork.

alter table public.comments
  add column if not exists parent_id uuid references public.comments (id) on delete cascade,
  add column if not exists updated_at timestamptz;

update public.comments
  set updated_at = created_at
  where updated_at is null;

alter table public.comments
  alter column updated_at set default now();

alter table public.comments
  alter column updated_at set not null;

create index if not exists comments_parent_id_created_at_idx
  on public.comments (parent_id, created_at);

create or replace function public.comments_validate_parent()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_creation uuid;
  parent_parent uuid;
begin
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
    raise exception 'parent_id cannot change';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'comment cannot reply to itself';
  end if;

  select creation_id, parent_id
    into parent_creation, parent_parent
    from public.comments
    where id = new.parent_id;

  if parent_creation is null then
    raise exception 'parent comment not found';
  end if;
  if parent_creation <> new.creation_id then
    raise exception 'parent must belong to the same creation';
  end if;
  if parent_parent is not null then
    raise exception 'replies cannot be nested';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_validate_parent on public.comments;
create trigger comments_validate_parent
  before insert or update on public.comments
  for each row
  execute function public.comments_validate_parent();

create or replace function public.comments_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
  before update of content on public.comments
  for each row
  execute function public.comments_touch_updated_at();

create policy comments_update_own
  on public.comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status = 'published'
  );

grant insert (parent_id) on table public.comments to authenticated;
grant update (content, updated_at) on table public.comments to authenticated;

-- Fork copies editor source. Gallery still does not link source.json.
create policy pixel_source_select_published_authenticated
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pixel-creations'
    and name like '%/source.json'
    and exists (
      select 1
      from public.creations c
      where c.status = 'published'
        and c.id::text = split_part(name, '/', 2)
        and c.user_id::text = split_part(name, '/', 1)
    )
  );
