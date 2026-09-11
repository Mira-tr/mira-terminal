create index if not exists cms_creators_owner_user_id_idx
  on public.cms_creators(owner_user_id);

create index if not exists cms_publication_revisions_created_by_idx
  on public.cms_publication_revisions(created_by, created_at desc);

create index if not exists cms_activity_log_actor_id_idx
  on public.cms_activity_log(actor_id, created_at desc);
