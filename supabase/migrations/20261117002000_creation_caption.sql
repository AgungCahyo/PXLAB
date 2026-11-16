-- Optional artwork caption (separate from title). Max 500 characters.

alter table public.creations
  add column if not exists caption text;

alter table public.creations
  drop constraint if exists creations_caption_len;

alter table public.creations
  add constraint creations_caption_len check (
    caption is null
    or char_length(caption) <= 500
  );

grant insert (caption) on table public.creations to authenticated;
grant update (caption) on table public.creations to authenticated;
