-- Add a lightweight view counter for published creations.
--
-- Views are counted via a security-definer RPC so clients cannot inflate or
-- reset the counter directly. The column is additive: existing rows default to 0.

alter table public.creations
  add column if not exists view_count bigint not null default 0;

grant select (view_count) on table public.creations to anon, authenticated;

create or replace function public.increment_creation_view(p_creation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creations
  set view_count = view_count + 1
  where id = p_creation_id
    and status = 'published'
    and (archived_at is null);
end;
$$;

revoke all on function public.increment_creation_view(uuid) from public;
grant execute on function public.increment_creation_view(uuid) to anon, authenticated;