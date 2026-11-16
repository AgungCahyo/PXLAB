-- Snapshot of ink color usage from RLE at publish time (Paper/index 0 excluded).
-- Shape: [{ "hex": "#55B8FF", "count": 1200 }, ...] or [] when only Paper. null = not computed.

alter table public.creations
  add column if not exists color_usage jsonb;

grant insert (color_usage) on table public.creations to authenticated;
grant update (color_usage) on table public.creations to authenticated;
