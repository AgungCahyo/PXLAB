-- B2: pixel creation type, private storage for editor source + rendered PNG.
-- Do not rewrite 20261116030000_creations.sql.

alter table public.creations
  drop constraint creations_type_allowed;

alter table public.creations
  add constraint creations_type_allowed
  check (type in ('pixel', 'text', 'visual', 'idea', 'story'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pixel-creations',
  'pixel-creations',
  false,
  524288,
  array['application/json', 'image/png']
)
on conflict (id) do nothing;

-- Objects live at {user_id}/{creation_id}/source.json or cover.png
create policy pixel_objects_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pixel-creations'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy pixel_objects_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pixel-creations'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy pixel_objects_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pixel-creations'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'pixel-creations'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy pixel_objects_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pixel-creations'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Published covers only. Source JSON stays private.
create policy pixel_covers_public_select
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'pixel-creations'
    and name like '%/cover.png'
    and exists (
      select 1
      from public.creations c
      where c.status = 'published'
        and c.id::text = split_part(name, '/', 2)
        and c.user_id::text = split_part(name, '/', 1)
    )
  );
