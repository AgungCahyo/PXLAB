-- Unified search ranking.
-- Explicit search only: callers pass a normalized query (>= 2 characters).
-- Both functions are SECURITY INVOKER so the existing public SELECT policies on
-- profiles and creations still apply. No extension or index is added here.

create or replace function public.search_creators_ranked(
  p_query text,
  p_limit integer default 6
)
returns table (
  item jsonb,
  total bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select lower(btrim(p_query)) as q
  ),
  hits as (
    select
      p.id,
      p.username,
      p.display_name,
      p.bio,
      p.avatar_url,
      p.avatar_config,
      case
        when lower(p.username) = params.q then 1
        when lower(coalesce(p.display_name, '')) = params.q then 2
        when starts_with(lower(p.username), params.q) then 3
        when starts_with(lower(coalesce(p.display_name, '')), params.q) then 4
        when position(params.q in lower(p.username)) > 0 then 5
        when position(params.q in lower(coalesce(p.display_name, ''))) > 0 then 6
        else 7
      end as relevance
    from public.profiles p
    cross join params
    where p.username is not null
      and btrim(p.username) <> ''
      and params.q <> ''
      and (
        lower(p.username) = params.q
        or lower(coalesce(p.display_name, '')) = params.q
        or starts_with(lower(p.username), params.q)
        or starts_with(lower(coalesce(p.display_name, '')), params.q)
        or position(params.q in lower(p.username)) > 0
        or position(params.q in lower(coalesce(p.display_name, ''))) > 0
      )
  ),
  page as (
    select hits.*
    from hits
    order by hits.relevance asc, lower(hits.username) asc, hits.id asc
    limit least(greatest(p_limit, 1), 12)
  ),
  ranked as (
    select page.*, (select count(*) from hits) as total
    from page
  )
  select
    jsonb_build_object(
      'id', ranked.id,
      'username', ranked.username,
      'display_name', ranked.display_name,
      'bio', ranked.bio,
      'avatar_url', ranked.avatar_url,
      'avatar_config', ranked.avatar_config,
      'works_count', (
        select count(*)
        from public.creations c
        where c.user_id = ranked.id
          and c.status = 'published'
          and c.type = 'pixel'
      )
    ) as item,
    ranked.total
  from ranked
  order by ranked.relevance asc, lower(ranked.username) asc, ranked.id asc
$$;

revoke all on function public.search_creators_ranked(text, integer) from public;
grant execute on function public.search_creators_ranked(text, integer) to anon, authenticated;

create or replace function public.search_published_creations_ranked(
  p_query text,
  p_tag text default null,
  p_type text default 'pixel',
  p_category text default null,
  p_following_user_ids uuid[] default null,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  item jsonb,
  total bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select lower(btrim(p_query)) as q
  ),
  hits as (
    select
      c.*,
      case
        when lower(c.title) = params.q then 1
        when starts_with(lower(c.title), params.q) then 2
        when position(params.q in lower(c.title)) > 0 then 3
        when (p_tag is not null and p_tag = any(c.tags)) then 4
        when position(params.q in lower(coalesce(c.caption, ''))) > 0 then 5
        else 6
      end as relevance
    from public.creations c
    cross join params
    where c.status = 'published'
      and params.q <> ''
      and (p_type is null or c.type = p_type)
      and (p_category is null or c.category = p_category)
      and (
        p_following_user_ids is null
        or cardinality(p_following_user_ids) = 0
        or c.user_id = any(p_following_user_ids)
      )
      and (
        lower(c.title) = params.q
        or starts_with(lower(c.title), params.q)
        or position(params.q in lower(c.title)) > 0
        or (p_tag is not null and p_tag = any(c.tags))
        or position(params.q in lower(coalesce(c.caption, ''))) > 0
      )
  ),
  counted as (
    select hits.*, count(*) over () as total
    from hits
  ),
  page as (
    select counted.*
    from counted
    order by counted.relevance asc, counted.published_at desc nulls last, counted.id asc
    limit least(greatest(p_limit, 1), 48)
    offset greatest(p_offset, 0)
  )
  select
    jsonb_build_object(
      'id', page.id,
      'title', page.title,
      'caption', page.caption,
      'tags', to_jsonb(page.tags),
      'type', page.type,
      'category', page.category,
      'status', page.status,
      'published_at', page.published_at,
      'updated_at', page.updated_at,
      'user_id', page.user_id,
      'cover_url', page.cover_url,
      'profiles', (
        select jsonb_build_object(
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'avatar_config', p.avatar_config
        )
        from public.profiles p
        where p.id = page.user_id
      )
    ) as item,
    page.total
  from page
  order by page.relevance asc, page.published_at desc nulls last, page.id asc
$$;

revoke all on function public.search_published_creations_ranked(text, text, text, text, uuid[], integer, integer) from public;
grant execute on function public.search_published_creations_ranked(text, text, text, text, uuid[], integer, integer) to anon, authenticated;
  