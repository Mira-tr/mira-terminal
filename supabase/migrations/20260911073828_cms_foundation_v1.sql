create table if not exists public.cms_admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.cms_creators (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  name_en text not null default '' check (char_length(name_en) <= 120),
  bio text not null default '' check (char_length(bio) <= 2000),
  activities jsonb not null default '[]'::jsonb check (jsonb_typeof(activities) = 'array'),
  status text not null default 'draft' check (status in ('draft','public','private')),
  owner_user_id uuid references auth.users(id) on delete set null,
  is_primary boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cms_creators_one_primary_idx
  on public.cms_creators ((is_primary)) where is_primary;

create table if not exists public.cms_site_sections (
  id uuid primary key default extensions.gen_random_uuid(),
  section_key text not null unique check (section_key ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(trim(title)) between 1 and 120),
  slug text not null default '' check (slug = '' or slug ~ '^[a-z0-9-]+$'),
  section_type text not null default 'page' check (section_type in ('home','page','collection','creators','system')),
  status text not null default 'draft' check (status in ('draft','published','hidden','archived')),
  navigation_label text not null default '' check (char_length(navigation_label) <= 80),
  show_in_navigation boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_content_records (
  id uuid primary key default extensions.gen_random_uuid(),
  collection text not null check (collection ~ '^[a-z0-9-]+$'),
  record_key text not null check (char_length(trim(record_key)) between 1 and 160),
  owner_creator_id uuid references public.cms_creators(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','public','private','archived')),
  sort_order integer not null default 0 check (sort_order >= 0),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) in ('object','array')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection, record_key)
);

create index if not exists cms_content_records_collection_idx
  on public.cms_content_records(collection, sort_order, updated_at desc);
create index if not exists cms_content_records_owner_idx
  on public.cms_content_records(owner_creator_id, collection, sort_order);

create table if not exists public.cms_publication_revisions (
  id bigint generated always as identity primary key,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'prepared' check (status in ('prepared','published','failed','superseded')),
  manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.cms_activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(trim(action)) between 1 and 120),
  entity_type text not null default '' check (char_length(entity_type) <= 80),
  entity_id text not null default '' check (char_length(entity_id) <= 160),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.cms_admin_members enable row level security;
alter table public.cms_creators enable row level security;
alter table public.cms_site_sections enable row level security;
alter table public.cms_content_records enable row level security;
alter table public.cms_publication_revisions enable row level security;
alter table public.cms_activity_log enable row level security;

revoke all on table public.cms_admin_members from anon, authenticated;
revoke all on table public.cms_creators from anon, authenticated;
revoke all on table public.cms_site_sections from anon, authenticated;
revoke all on table public.cms_content_records from anon, authenticated;
revoke all on table public.cms_publication_revisions from anon, authenticated;
revoke all on table public.cms_activity_log from anon, authenticated;

grant select on table public.cms_admin_members to authenticated;
grant select, insert, update, delete on table public.cms_creators to authenticated;
grant select, insert, update, delete on table public.cms_site_sections to authenticated;
grant select, insert, update, delete on table public.cms_content_records to authenticated;
grant select, insert, update, delete on table public.cms_publication_revisions to authenticated;
grant select, insert on table public.cms_activity_log to authenticated;

grant all on table public.cms_admin_members to service_role;
grant all on table public.cms_creators to service_role;
grant all on table public.cms_site_sections to service_role;
grant all on table public.cms_content_records to service_role;
grant all on table public.cms_publication_revisions to service_role;
grant all on table public.cms_activity_log to service_role;
grant usage, select on sequence public.cms_publication_revisions_id_seq to authenticated, service_role;
grant usage, select on sequence public.cms_activity_log_id_seq to authenticated, service_role;

create policy cms_admin_members_select_self
  on public.cms_admin_members for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy cms_creators_select
  on public.cms_creators for select
  to authenticated
  using (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or owner_user_id = (select auth.uid())
  );
create policy cms_creators_insert_admin
  on public.cms_creators for insert
  to authenticated
  with check (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())));
create policy cms_creators_update
  on public.cms_creators for update
  to authenticated
  using (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or owner_user_id = (select auth.uid())
  )
  with check (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or owner_user_id = (select auth.uid())
  );
create policy cms_creators_delete_admin
  on public.cms_creators for delete
  to authenticated
  using (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())));

create policy cms_site_sections_admin_all
  on public.cms_site_sections for all
  to authenticated
  using (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())));

create policy cms_content_records_select
  on public.cms_content_records for select
  to authenticated
  using (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or exists (
      select 1 from public.cms_creators c
      where c.id = owner_creator_id and c.owner_user_id = (select auth.uid())
    )
  );
create policy cms_content_records_insert
  on public.cms_content_records for insert
  to authenticated
  with check (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or exists (
      select 1 from public.cms_creators c
      where c.id = owner_creator_id and c.owner_user_id = (select auth.uid())
    )
  );
create policy cms_content_records_update
  on public.cms_content_records for update
  to authenticated
  using (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or exists (
      select 1 from public.cms_creators c
      where c.id = owner_creator_id and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or exists (
      select 1 from public.cms_creators c
      where c.id = owner_creator_id and c.owner_user_id = (select auth.uid())
    )
  );
create policy cms_content_records_delete
  on public.cms_content_records for delete
  to authenticated
  using (
    exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
    or exists (
      select 1 from public.cms_creators c
      where c.id = owner_creator_id and c.owner_user_id = (select auth.uid())
    )
  );

create policy cms_publication_revisions_admin_all
  on public.cms_publication_revisions for all
  to authenticated
  using (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())));

create policy cms_activity_log_select_admin
  on public.cms_activity_log for select
  to authenticated
  using (exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid())));
create policy cms_activity_log_insert_admin
  on public.cms_activity_log for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (select 1 from public.cms_admin_members m where m.user_id = (select auth.uid()))
  );

insert into public.cms_site_sections
  (section_key, title, slug, section_type, status, navigation_label, show_in_navigation, sort_order)
values
  ('home', 'Home', '', 'home', 'published', 'Home', true, 1),
  ('projects', 'Projects', 'projects', 'collection', 'published', 'Projects', true, 2),
  ('tools', 'Tools', 'tools', 'collection', 'published', 'Tools', true, 3),
  ('notes', 'Notes', 'notes', 'collection', 'published', 'Notes', true, 4),
  ('creators', 'Creators', 'creators', 'creators', 'published', 'Creators', true, 5),
  ('about', 'About', 'about', 'page', 'published', 'About', true, 6),
  ('contact', 'Contact', 'contact', 'page', 'published', 'Contact', true, 7)
on conflict (section_key) do nothing;

insert into public.cms_creators
  (slug, display_name, bio, activities, status, owner_user_id, is_primary, sort_order)
values
  ('chikage', '千景', '', '["TRPG","Game","Tools","Notes","Web"]'::jsonb, 'public', null, true, 1)
on conflict (slug) do nothing;
