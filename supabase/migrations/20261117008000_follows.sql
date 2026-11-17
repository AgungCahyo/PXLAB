-- Fase C (K7): one-way follows. No public follower counts.
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_follower_id_created_at_idx
  on public.follows (follower_id, created_at desc);
create index follows_following_id_idx
  on public.follows (following_id);

alter table public.follows enable row level security;

-- Members can see their own outgoing/incoming follows (for buttons and private lists).
create policy follows_select_own
  on public.follows
  for select
  to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

create policy follows_insert_own
  on public.follows
  for insert
  to authenticated
  with check (follower_id = auth.uid() and follower_id <> following_id);

create policy follows_delete_own
  on public.follows
  for delete
  to authenticated
  using (follower_id = auth.uid());

revoke all on table public.follows from anon, authenticated;
grant select on table public.follows to authenticated;
grant insert (follower_id, following_id) on table public.follows to authenticated;
grant delete on table public.follows to authenticated;
