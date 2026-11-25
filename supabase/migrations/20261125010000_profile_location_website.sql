-- Additive profile fields for the dedicated edit-profile page.
-- Keeps all existing grants/policies intact; only the two new columns are writable.

alter table public.profiles
  add column if not exists location text,
  add column if not exists website text;

alter table public.profiles drop constraint if exists profiles_location_len;
alter table public.profiles add constraint profiles_location_len
  check (location is null or char_length(location) between 1 and 60);

alter table public.profiles drop constraint if exists profiles_website_len;
alter table public.profiles add constraint profiles_website_len
  check (website is null or char_length(website) <= 200);

alter table public.profiles drop constraint if exists profiles_website_url;
alter table public.profiles add constraint profiles_website_url
  check (website is null or website ~* '^https?://');

grant update (location, website) on table public.profiles to authenticated;
