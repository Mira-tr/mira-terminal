-- RELMUA TRPG Preparation: compact, table-scoped preparation tracking.
-- This migration is additive. Preparation remains separate from scheduling
-- candidates, responses, rounds, and durable sessions.

create table public.schedule_preparation_items (
    id uuid primary key default extensions.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    title text not null,
    category text not null default 'other',
    status text not null default 'pending',
    assignee_participant_id uuid references public.schedule_participants(id) on delete set null,
    round_id uuid references public.schedule_rounds(id) on delete restrict,
    session_id uuid references public.schedule_sessions(id) on delete set null,
    note text not null default '',
    sort_order integer not null default 0,
    created_by uuid not null references auth.users(id) on delete restrict,
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_preparation_items_title_length check (char_length(trim(title)) between 1 and 120),
    constraint schedule_preparation_items_category_check check (category in ('character', 'character_sheet', 'handout', 'secret', 'portrait', 'token', 'assets', 'bgm', 'scenario', 'venue', 'other')),
    constraint schedule_preparation_items_status_check check (status in ('pending', 'done')),
    constraint schedule_preparation_items_note_length check (char_length(note) <= 400),
    constraint schedule_preparation_items_sort_order_check check (sort_order >= 0)
);

create index schedule_preparation_items_active_order_idx
on public.schedule_preparation_items(schedule_id, status, sort_order, created_at)
where archived_at is null;
create index schedule_preparation_items_assignee_pending_idx
on public.schedule_preparation_items(assignee_participant_id, schedule_id, sort_order)
where archived_at is null and status = 'pending';
create index schedule_preparation_items_round_idx
on public.schedule_preparation_items(round_id)
where round_id is not null and archived_at is null;
create index schedule_preparation_items_session_idx
on public.schedule_preparation_items(session_id)
where session_id is not null and archived_at is null;

create or replace function public.trpg_v12_touch_preparation_item()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.trpg_v12_validate_preparation_item()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare assignee public.schedule_participants%rowtype; round_item public.schedule_rounds%rowtype; session_item public.schedule_sessions%rowtype;
begin
    new.title = left(trim(coalesce(new.title, '')), 120);
    new.note = left(trim(coalesce(new.note, '')), 400);
    if char_length(new.title) < 1 then raise exception 'preparation title is required' using errcode = '22023'; end if;

    if new.assignee_participant_id is not null then
        select * into assignee from public.schedule_participants participant where participant.id = new.assignee_participant_id;
        if assignee.id is null or assignee.schedule_id <> new.schedule_id or assignee.user_id is null or assignee.role not in ('owner', 'participant') then
            raise exception 'preparation assignee must be an account participant in this table' using errcode = '22023';
        end if;
    end if;

    if new.round_id is not null then
        select * into round_item from public.schedule_rounds round_value where round_value.id = new.round_id;
        if round_item.id is null or round_item.schedule_id <> new.schedule_id then
            raise exception 'preparation round must belong to this table' using errcode = '22023';
        end if;
    end if;

    if new.session_id is not null then
        select * into session_item from public.schedule_sessions session_value where session_value.id = new.session_id;
        if session_item.id is null or session_item.schedule_id <> new.schedule_id then
            raise exception 'preparation session must belong to this table' using errcode = '22023';
        end if;
        if new.round_id is not null and session_item.round_id <> new.round_id then
            raise exception 'preparation session must belong to the selected round' using errcode = '22023';
        end if;
    end if;
    return new;
end;
$$;

create trigger trpg_v12_touch_preparation_before_write
before update on public.schedule_preparation_items
for each row execute function public.trpg_v12_touch_preparation_item();

create trigger trpg_v12_validate_preparation_before_write
before insert or update on public.schedule_preparation_items
for each row execute function public.trpg_v12_validate_preparation_item();

alter table public.schedule_preparation_items enable row level security;

create policy schedule_preparation_items_member_select on public.schedule_preparation_items
for select to authenticated
using (exists (
    select 1 from public.schedule_participants participant
    where participant.schedule_id = schedule_preparation_items.schedule_id
      and participant.user_id = auth.uid()
));

revoke all on table public.schedule_preparation_items from anon, authenticated;
grant select on table public.schedule_preparation_items to authenticated;

create or replace function public.trpg_v12_assert_preparation_owner(p_schedule_id uuid)
returns public.schedules
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    return target_schedule;
end;
$$;

create or replace function public.trpg_v12_preparation_context(p_schedule_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid; actor_participant_id uuid; items_payload jsonb; total_count integer; done_count integer; own_pending_count integer;
begin
    actor_id = auth.uid();
    if actor_id is null then raise exception 'authentication required' using errcode = '28000'; end if;

    select participant.id into actor_participant_id
    from public.schedule_participants participant
    where participant.schedule_id = p_schedule_id and participant.user_id = actor_id;
    if actor_participant_id is null then raise exception 'participant access denied' using errcode = '28000'; end if;

    select count(*), count(*) filter (where item.status = 'done'), count(*) filter (where item.status = 'pending' and item.assignee_participant_id = actor_participant_id)
    into total_count, done_count, own_pending_count
    from public.schedule_preparation_items item
    where item.schedule_id = p_schedule_id and item.archived_at is null;

    select coalesce(jsonb_agg(jsonb_build_object(
        'id', item.id,
        'scheduleId', item.schedule_id,
        'title', item.title,
        'category', item.category,
        'status', item.status,
        'assigneeParticipantId', item.assignee_participant_id,
        'assigneeDisplayName', assignee.display_name,
        'roundId', item.round_id,
        'roundSequence', round_item.sequence,
        'sessionId', item.session_id,
        'sessionSequence', session_item.sequence,
        'sessionStartsAt', session_item.starts_at,
        'note', item.note,
        'sortOrder', item.sort_order,
        'createdBy', item.created_by,
        'createdAt', item.created_at,
        'updatedAt', item.updated_at,
        'canComplete', (schedule.owner_id = actor_id or item.assignee_participant_id = actor_participant_id)
    ) order by case item.status when 'pending' then 0 else 1 end, item.sort_order, item.created_at), '[]'::jsonb)
    into items_payload
    from public.schedule_preparation_items item
    join public.schedules schedule on schedule.id = item.schedule_id
    left join public.schedule_participants assignee on assignee.id = item.assignee_participant_id
    left join public.schedule_rounds round_item on round_item.id = item.round_id
    left join public.schedule_sessions session_item on session_item.id = item.session_id
    where item.schedule_id = p_schedule_id and item.archived_at is null;

    return jsonb_build_object(
        'total', coalesce(total_count, 0),
        'done', coalesce(done_count, 0),
        'pending', greatest(0, coalesce(total_count, 0) - coalesce(done_count, 0)),
        'ownPending', coalesce(own_pending_count, 0),
        'items', items_payload
    );
end;
$$;

create or replace function public.trpg_v12_create_preparation_item(
    p_schedule_id uuid,
    p_title text,
    p_category text default 'other',
    p_assignee_participant_id uuid default null,
    p_round_id uuid default null,
    p_session_id uuid default null,
    p_note text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare next_order integer; saved_item public.schedule_preparation_items%rowtype;
begin
    perform public.trpg_v12_assert_preparation_owner(p_schedule_id);
    select coalesce(max(item.sort_order), -1) + 1 into next_order from public.schedule_preparation_items item where item.schedule_id = p_schedule_id and item.archived_at is null;
    insert into public.schedule_preparation_items (schedule_id, title, category, assignee_participant_id, round_id, session_id, note, sort_order, created_by)
    values (p_schedule_id, p_title, coalesce(nullif(trim(p_category), ''), 'other'), p_assignee_participant_id, p_round_id, p_session_id, p_note, next_order, auth.uid())
    returning * into saved_item;
    return jsonb_build_object('itemId', saved_item.id, 'context', public.trpg_v12_preparation_context(p_schedule_id));
end;
$$;

create or replace function public.trpg_v12_update_preparation_item(
    p_schedule_id uuid,
    p_item_id uuid,
    p_title text,
    p_category text,
    p_assignee_participant_id uuid default null,
    p_round_id uuid default null,
    p_session_id uuid default null,
    p_note text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare saved_item public.schedule_preparation_items%rowtype;
begin
    perform public.trpg_v12_assert_preparation_owner(p_schedule_id);
    update public.schedule_preparation_items item
    set title = p_title,
        category = coalesce(nullif(trim(p_category), ''), 'other'),
        assignee_participant_id = p_assignee_participant_id,
        round_id = p_round_id,
        session_id = p_session_id,
        note = p_note
    where item.id = p_item_id and item.schedule_id = p_schedule_id and item.archived_at is null
    returning * into saved_item;
    if saved_item.id is null then raise exception 'preparation item not found' using errcode = 'P0002'; end if;
    return jsonb_build_object('itemId', saved_item.id, 'context', public.trpg_v12_preparation_context(p_schedule_id));
end;
$$;

create or replace function public.trpg_v12_set_preparation_status(
    p_schedule_id uuid,
    p_item_id uuid,
    p_done boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid; actor_participant_id uuid; target_schedule public.schedules%rowtype; saved_item public.schedule_preparation_items%rowtype;
begin
    actor_id = auth.uid();
    if actor_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id;
    if target_schedule.id is null then raise exception 'schedule not found' using errcode = 'P0002'; end if;
    select participant.id into actor_participant_id from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.user_id = actor_id;
    if actor_participant_id is null then raise exception 'participant access denied' using errcode = '28000'; end if;
    select * into saved_item from public.schedule_preparation_items item where item.id = p_item_id and item.schedule_id = p_schedule_id and item.archived_at is null for update;
    if saved_item.id is null then raise exception 'preparation item not found' using errcode = 'P0002'; end if;
    if target_schedule.owner_id <> actor_id and saved_item.assignee_participant_id is distinct from actor_participant_id then
        raise exception 'preparation completion access denied' using errcode = '28000';
    end if;
    update public.schedule_preparation_items set status = case when p_done then 'done' else 'pending' end where id = saved_item.id;
    return jsonb_build_object('itemId', saved_item.id, 'context', public.trpg_v12_preparation_context(p_schedule_id));
end;
$$;

create or replace function public.trpg_v12_archive_preparation_item(p_schedule_id uuid, p_item_id uuid, p_restore boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare saved_item public.schedule_preparation_items%rowtype;
begin
    perform public.trpg_v12_assert_preparation_owner(p_schedule_id);
    update public.schedule_preparation_items item
    set archived_at = case when p_restore then null else coalesce(item.archived_at, now()) end
    where item.id = p_item_id and item.schedule_id = p_schedule_id
    returning * into saved_item;
    if saved_item.id is null then raise exception 'preparation item not found' using errcode = 'P0002'; end if;
    return jsonb_build_object('itemId', saved_item.id, 'context', public.trpg_v12_preparation_context(p_schedule_id));
end;
$$;

create or replace function public.trpg_v12_reorder_preparation_items(p_schedule_id uuid, p_item_ids jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare expected_count integer; supplied_count integer; distinct_count integer;
begin
    perform public.trpg_v12_assert_preparation_owner(p_schedule_id);
    if jsonb_typeof(coalesce(p_item_ids, '[]'::jsonb)) <> 'array' then raise exception 'preparation order must be an array' using errcode = '22023'; end if;
    select count(*) into expected_count from public.schedule_preparation_items item where item.schedule_id = p_schedule_id and item.archived_at is null;
    select count(*), count(distinct item_id) into supplied_count, distinct_count from (
        select value::text::uuid as item_id from jsonb_array_elements_text(p_item_ids)
    ) input;
    if supplied_count <> expected_count or distinct_count <> supplied_count then raise exception 'preparation order is incomplete' using errcode = '22023'; end if;
    if exists (
        select 1 from jsonb_array_elements_text(p_item_ids) with ordinality input(value, position)
        left join public.schedule_preparation_items item on item.id = input.value::uuid and item.schedule_id = p_schedule_id and item.archived_at is null
        where item.id is null
    ) then raise exception 'preparation item does not belong to this table' using errcode = '22023'; end if;
    update public.schedule_preparation_items item
    set sort_order = input.position - 1
    from jsonb_array_elements_text(p_item_ids) with ordinality input(value, position)
    where item.id = input.value::uuid and item.schedule_id = p_schedule_id and item.archived_at is null;
    return public.trpg_v12_preparation_context(p_schedule_id);
end;
$$;

create or replace function public.trpg_v12_bot_schedule_context(p_discord_user_id text, p_schedule_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare context_payload jsonb;
begin
    context_payload = public.trpg_v10_bot_schedule_context(p_discord_user_id, p_schedule_id);
    return context_payload || jsonb_build_object('preparation', public.trpg_v12_preparation_context(p_schedule_id));
end;
$$;

create or replace function public.trpg_v12_bot_set_preparation_status(p_discord_user_id text, p_schedule_id uuid, p_item_id uuid, p_done boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
    perform public.trpg_v10_bot_set_actor(p_discord_user_id);
    return public.trpg_v12_set_preparation_status(p_schedule_id, p_item_id, p_done);
end;
$$;

revoke all on function public.trpg_v12_assert_preparation_owner(uuid) from public, anon, authenticated;
revoke all on function public.trpg_v12_preparation_context(uuid) from public, anon, authenticated;
revoke all on function public.trpg_v12_create_preparation_item(uuid, text, text, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.trpg_v12_update_preparation_item(uuid, uuid, text, text, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.trpg_v12_set_preparation_status(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.trpg_v12_archive_preparation_item(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.trpg_v12_reorder_preparation_items(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v12_bot_schedule_context(text, uuid) from public, anon, authenticated;
revoke all on function public.trpg_v12_bot_set_preparation_status(text, uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.trpg_v12_preparation_context(uuid) to authenticated;
grant execute on function public.trpg_v12_create_preparation_item(uuid, text, text, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.trpg_v12_update_preparation_item(uuid, uuid, text, text, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.trpg_v12_set_preparation_status(uuid, uuid, boolean) to authenticated;
grant execute on function public.trpg_v12_archive_preparation_item(uuid, uuid, boolean) to authenticated;
grant execute on function public.trpg_v12_reorder_preparation_items(uuid, jsonb) to authenticated;
grant execute on function public.trpg_v12_bot_schedule_context(text, uuid) to service_role;
grant execute on function public.trpg_v12_bot_set_preparation_status(text, uuid, uuid, boolean) to service_role;
