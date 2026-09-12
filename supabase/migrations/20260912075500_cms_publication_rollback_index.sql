create index if not exists cms_publication_requests_rollback_of_idx
    on public.cms_publication_requests(rollback_of)
    where rollback_of is not null;
