alter table public.cms_creators
  drop constraint if exists cms_creators_legacy_id_format_check;

alter table public.cms_creators
  add constraint cms_creators_legacy_id_format_check
  check (
    char_length(legacy_id) between 1 and 120
    and legacy_id ~ '^[a-z0-9-]+$'
  );
