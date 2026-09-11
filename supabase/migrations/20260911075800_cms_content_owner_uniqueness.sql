alter table public.cms_content_records
  drop constraint if exists cms_content_records_collection_record_key_key;

create unique index if not exists cms_content_records_owner_record_key_uidx
  on public.cms_content_records(collection, owner_creator_id, record_key)
  nulls not distinct;
