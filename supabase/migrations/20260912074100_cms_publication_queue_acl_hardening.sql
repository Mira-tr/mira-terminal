-- The browser Admin talks to the authenticated admin-publish Edge Function.
-- Direct Data API access to publication rows is intentionally disabled so every
-- enqueue / rollback / history read passes through the same validation boundary.

revoke all on table public.cms_publication_requests from anon;
revoke all on table public.cms_publication_requests from authenticated;
grant select, insert, update, delete on table public.cms_publication_requests to service_role;

drop policy if exists cms_publication_requests_select_admin on public.cms_publication_requests;
drop policy if exists cms_publication_requests_insert_admin on public.cms_publication_requests;

comment on table public.cms_publication_requests is
    'Private Admin publication queue. Browser access is Edge Function-only; GitHub OIDC worker owns lifecycle updates.';
