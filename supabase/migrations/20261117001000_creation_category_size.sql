-- Switch category from thematic tags to pixel size presets (icon, sprite, …).

update public.creations
set category = null
where category is not null
  and category not in ('icon', 'small', 'sprite', 'medium', 'large', 'poster', 'custom');

alter table public.creations
  drop constraint if exists creations_category_allowed;

alter table public.creations
  add constraint creations_category_allowed check (
    category is null
    or category in ('icon', 'small', 'sprite', 'medium', 'large', 'poster', 'custom')
  );

-- Backfill size category from pixel content dimensions.
update public.creations
set category = case
  when (content->>'width')::int = 16 and (content->>'height')::int = 16 then 'icon'
  when (content->>'width')::int = 32 and (content->>'height')::int = 32 then 'small'
  when (content->>'width')::int = 64 and (content->>'height')::int = 64 then 'sprite'
  when (content->>'width')::int = 128 and (content->>'height')::int = 128 then 'medium'
  when (content->>'width')::int = 256 and (content->>'height')::int = 256 then 'large'
  when (content->>'width')::int = 512 and (content->>'height')::int = 512 then 'poster'
  else 'custom'
end
where type = 'pixel'
  and content ? 'width'
  and content ? 'height'
  and (
    category is null
    or category not in ('icon', 'small', 'sprite', 'medium', 'large', 'poster', 'custom')
  );
