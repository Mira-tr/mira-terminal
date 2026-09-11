alter table public.cms_creators
  add column if not exists legacy_id text;

alter table public.cms_creators
  add column if not exists profile jsonb not null default '{}'::jsonb;

update public.cms_creators
set legacy_id = 'creator-' || slug
where legacy_id is null or btrim(legacy_id) = '';

alter table public.cms_creators
  alter column legacy_id set not null;

alter table public.cms_creators
  drop constraint if exists cms_creators_status_check;

alter table public.cms_creators
  add constraint cms_creators_status_check
  check (status in ('draft','public','private','archived'));

alter table public.cms_creators
  drop constraint if exists cms_creators_legacy_id_format_check;

alter table public.cms_creators
  add constraint cms_creators_legacy_id_format_check
  check (legacy_id ~ '^creator-[a-z0-9-]+$');

alter table public.cms_creators
  drop constraint if exists cms_creators_profile_object_check;

alter table public.cms_creators
  add constraint cms_creators_profile_object_check
  check (jsonb_typeof(profile) = 'object');

create unique index if not exists cms_creators_legacy_id_uidx
  on public.cms_creators(legacy_id);
