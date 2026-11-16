-- Creator-controlled official PNG download permission. Default OFF.
-- Display/cover access stays separate; fork stays separate.

alter table public.creations
  add column if not exists allow_png_download boolean not null default false;

grant insert (allow_png_download) on table public.creations to authenticated;
grant update (allow_png_download) on table public.creations to authenticated;
