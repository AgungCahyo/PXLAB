-- Optional topical hashtags per creation (not size category). Max 5.

alter table public.creations
  add column if not exists tags text[] not null default '{}';

alter table public.creations
  drop constraint if exists creations_tags_len;

alter table public.creations
  add constraint creations_tags_len check (cardinality(tags) <= 5);

grant insert (tags) on table public.creations to authenticated;
grant update (tags) on table public.creations to authenticated;
