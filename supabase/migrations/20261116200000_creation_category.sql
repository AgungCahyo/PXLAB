-- Size preset used for Explore filters. Nullable; derived from canvas size at create/save.

alter table public.creations
  add column if not exists category text;

alter table public.creations
  drop constraint if exists creations_category_allowed;

alter table public.creations
  add constraint creations_category_allowed check (
    category is null
    or category in ('icon', 'small', 'sprite', 'medium', 'large', 'poster', 'custom')
  );

create index if not exists creations_category_status_published_at_idx
  on public.creations (category, status, published_at desc);

grant insert (category) on table public.creations to authenticated;
grant update (category) on table public.creations to authenticated;
