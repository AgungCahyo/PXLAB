-- Saved works and a reversible archive flag.
--
-- Both changes are additive: existing creations keep their status and existing
-- profile grants are untouched. The archive flag is separate from `status`, so
-- a published work can be hidden from feeds without becoming a draft.

create table if not exists public.saved_creations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  creation_id uuid not null references public.creations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creation_id)
);

create index if not exists saved_creations_user_created_at_idx
  on public.saved_creations (user_id, created_at desc);

alter table public.saved_creations enable row level security;

revoke all on table public.saved_creations from anon, authenticated;

drop policy if exists saved_creations_select_own on public.saved_creations;
create policy saved_creations_select_own
  on public.saved_creations
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists saved_creations_insert_own on public.saved_creations;
create policy saved_creations_insert_own
  on public.saved_creations
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Upsert from the Save button needs an update path on conflict.
drop policy if exists saved_creations_update_own on public.saved_creations;
create policy saved_creations_update_own
  on public.saved_creations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists saved_creations_delete_own on public.saved_creations;
create policy saved_creations_delete_own
  on public.saved_creations
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on table public.saved_creations to authenticated;

alter table public.creations
  add column if not exists archived_at timestamptz;

-- Archived works stay visible to their owner and admins through the existing
-- select policies, but drop out of public feed/search reads.
drop policy if exists creations_select_published on public.creations;

create policy creations_select_published
  on public.creations
  for select
  using (status = 'published' and archived_at is null);

-- The existing creations_update_own policy still gates the row; this only
-- adds the new column to the column-level grant.
grant update (archived_at) on table public.creations to authenticated;
