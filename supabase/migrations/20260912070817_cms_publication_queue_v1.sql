create table if not exists public.cms_publication_requests (
    id uuid primary key default gen_random_uuid(),
    requested_by uuid not null,
    surface_id text not null default '',
    fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
    snapshot jsonb not null,
    status text not null default 'queued' check (status in ('queued','processing','published','failed','superseded')),
    requested_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{40}$'),
    workflow_run_id text,
    deployment_url text,
    error_message text,
    rollback_of uuid references public.cms_publication_requests(id) on delete set null
);

create index if not exists cms_publication_requests_status_requested_idx
    on public.cms_publication_requests(status, requested_at desc);
create index if not exists cms_publication_requests_fingerprint_idx
    on public.cms_publication_requests(fingerprint, requested_at desc);
create index if not exists cms_publication_requests_requested_by_idx
    on public.cms_publication_requests(requested_by, requested_at desc);

alter table public.cms_publication_requests enable row level security;

revoke all on table public.cms_publication_requests from anon;
grant select, insert on table public.cms_publication_requests to authenticated;

drop policy if exists cms_publication_requests_select_admin on public.cms_publication_requests;
create policy cms_publication_requests_select_admin
on public.cms_publication_requests
for select
to authenticated
using (
    exists (
        select 1
        from public.cms_admin_members member
        where member.user_id = (select auth.uid())
    )
);

drop policy if exists cms_publication_requests_insert_admin on public.cms_publication_requests;
create policy cms_publication_requests_insert_admin
on public.cms_publication_requests
for insert
to authenticated
with check (
    requested_by = (select auth.uid())
    and exists (
        select 1
        from public.cms_admin_members member
        where member.user_id = (select auth.uid())
    )
);

comment on table public.cms_publication_requests is 'Private Admin publication queue. Stores only validated Public Snapshot Packages; GitHub OIDC worker owns lifecycle updates.';
