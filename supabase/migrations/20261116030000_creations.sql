-- Phase 3: individual creations, Explore, owner-only drafts.
-- Hidden is reserved for later admin moderation. Members may only set draft or published.
-- Fork UI is deferred; forked_from exists so Phase 5 can attach a source.

create table public.creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  type text not null,
  content jsonb not null,
  cover_url text,
  status text not null default 'draft',
  forked_from uuid references public.creations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint creations_title_len check (char_length(title) between 1 and 80),
  constraint creations_type_allowed check (type in ('text', 'visual', 'idea', 'story')),
  constraint creations_status_allowed check (status in ('draft', 'published', 'hidden')),
  constraint creations_content_size check (octet_length(content::text) <= 32000),
  constraint creations_published_at_consistent check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create index creations_status_published_at_idx
  on public.creations (status, published_at desc);
create index creations_user_id_created_at_idx
  on public.creations (user_id, created_at desc);
create index creations_type_status_published_at_idx
  on public.creations (type, status, published_at desc);

create trigger creations_set_updated_at
  before update on public.creations
  for each row
  execute function public.set_updated_at();

alter table public.creations enable row level security;

create policy creations_select_published
  on public.creations
  for select
  using (status = 'published');

create policy creations_select_own
  on public.creations
  for select
  to authenticated
  using (user_id = auth.uid());

create policy creations_select_admin
  on public.creations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy creations_insert_own
  on public.creations
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'draft');

-- Member A can update Member A only. Status cannot become hidden from this policy.
create policy creations_update_own
  on public.creations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('draft', 'published'));

create policy creations_delete_own
  on public.creations
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.creations from anon, authenticated;
grant select on table public.creations to anon, authenticated;
grant insert (user_id, title, type, content, cover_url)
  on table public.creations to authenticated;
grant update (title, content, cover_url, status, published_at, updated_at)
  on table public.creations to authenticated;
grant delete on table public.creations to authenticated;
