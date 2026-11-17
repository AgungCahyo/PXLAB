-- Fase B (K6): last time the member opened their response inbox.
alter table public.profiles
  add column if not exists activity_seen_at timestamptz;

grant update (activity_seen_at)
  on table public.profiles to authenticated;
