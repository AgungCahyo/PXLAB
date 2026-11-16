-- Phase 4: one shared Common Space canvas.
-- Hidden is reserved for later admin moderation. Members insert active rows only.
-- Positions use the normalized 0–1000 canvas (origin top-left).

create table public.space_elements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  element_type text not null,
  content jsonb not null,
  position_x numeric not null,
  position_y numeric not null,
  width numeric,
  height numeric,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_elements_type_allowed check (element_type in ('text', 'shape')),
  constraint space_elements_status_allowed check (status in ('active', 'hidden')),
  constraint space_elements_x check (position_x >= 0 and position_x <= 1000),
  constraint space_elements_y check (position_y >= 0 and position_y <= 1000),
  constraint space_elements_width check (width is null or (width >= 1 and width <= 1000)),
  constraint space_elements_height check (height is null or (height >= 1 and height <= 1000)),
  constraint space_elements_content_size check (octet_length(content::text) <= 2000)
);

create index space_elements_status_created_at_idx
  on public.space_elements (status, created_at);
create index space_elements_user_id_created_at_idx
  on public.space_elements (user_id, created_at desc);

create trigger space_elements_set_updated_at
  before update on public.space_elements
  for each row
  execute function public.set_updated_at();

alter table public.space_elements enable row level security;

create policy space_elements_select_active
  on public.space_elements
  for select
  using (status = 'active');

create policy space_elements_select_own
  on public.space_elements
  for select
  to authenticated
  using (user_id = auth.uid());

create policy space_elements_select_admin
  on public.space_elements
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy space_elements_insert_own
  on public.space_elements
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'active');

-- Member A can update Member A only. Status cannot become hidden here.
create policy space_elements_update_own
  on public.space_elements
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'active');

create policy space_elements_delete_own
  on public.space_elements
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.space_elements from anon, authenticated;
grant select on table public.space_elements to anon, authenticated;
grant insert (user_id, element_type, content, position_x, position_y, width, height)
  on table public.space_elements to authenticated;
grant update (position_x, position_y, updated_at)
  on table public.space_elements to authenticated;
grant delete on table public.space_elements to authenticated;
