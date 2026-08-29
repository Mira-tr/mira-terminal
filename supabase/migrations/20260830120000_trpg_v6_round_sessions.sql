-- RELMUA TRPG Scheduler V6: durable tables contain ordered rounds and sessions.
-- This migration is additive. Existing schedules become Round 1 and existing
-- confirmed slots are preserved as compatibility mirrors for durable sessions.

create table if not exists public.schedule_rounds (
    id uuid primary key default extensions.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    sequence integer not null,
    status text not null default 'draft',
    title text not null default '',
    purpose text not null default '',
    target_minutes integer not null default 0,
    created_at timestamptz not null default now(),
    opened_at timestamptz,
    confirmed_at timestamptz,
    closed_at timestamptz,
    updated_at timestamptz not null default now(),
    constraint schedule_rounds_sequence_check check (sequence >= 1),
    constraint schedule_rounds_status_check check (status in ('draft', 'open', 'confirmed', 'closed')),
    constraint schedule_rounds_title_length check (char_length(title) <= 120),
    constraint schedule_rounds_purpose_length check (char_length(purpose) <= 400),
    constraint schedule_rounds_target_minutes_check check (target_minutes between 0 and 1800),
    unique (schedule_id, sequence)
);

create table if not exists public.schedule_sessions (
    id uuid primary key default extensions.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    round_id uuid not null references public.schedule_rounds(id) on delete restrict,
    candidate_id uuid references public.schedule_slots(id) on delete set null,
    sequence integer not null,
    status text not null default 'scheduled',
    local_date date not null,
    start_minute integer not null,
    end_minute integer not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    memo text not null default '',
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_sessions_sequence_check check (sequence >= 1),
    constraint schedule_sessions_status_check check (status in ('scheduled', 'completed', 'cancelled')),
    constraint schedule_sessions_minute_check check (start_minute >= 0 and end_minute > start_minute and end_minute <= 1800),
    constraint schedule_sessions_time_check check (ends_at > starts_at),
    constraint schedule_sessions_memo_length check (char_length(memo) <= 400),
    unique (schedule_id, sequence)
);

alter table public.schedule_slots
    add column if not exists round_id uuid references public.schedule_rounds(id) on delete restrict;

alter table public.schedule_confirmed_slots
    add column if not exists round_id uuid references public.schedule_rounds(id) on delete restrict,
    add column if not exists session_id uuid references public.schedule_sessions(id) on delete set null;

insert into public.schedule_rounds (schedule_id, sequence, status, title, purpose, target_minutes, opened_at, confirmed_at, closed_at)
select
    schedule.id,
    1,
    case
        when exists (select 1 from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = schedule.id) then 'confirmed'
        when schedule.status = 'draft' then 'draft'
        else 'open'
    end,
    '',
    '',
    least(1800, greatest(0, coalesce(nullif(schedule.total_minutes, 0), schedule.session_minutes))),
    case when schedule.status <> 'draft' and not exists (select 1 from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = schedule.id) then now() else null end,
    case when exists (select 1 from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = schedule.id) then now() else null end,
    null
from public.schedules schedule
where not exists (
    select 1 from public.schedule_rounds round_item
    where round_item.schedule_id = schedule.id and round_item.sequence = 1
);

update public.schedule_slots slot
set round_id = round_item.id
from public.schedule_rounds round_item
where slot.round_id is null
  and round_item.schedule_id = slot.schedule_id
  and round_item.sequence = 1;

update public.schedule_confirmed_slots confirmed
set round_id = coalesce((
    select slot.round_id
    from public.schedule_slots slot
    where slot.id = confirmed.slot_id
), round_item.id)
from public.schedule_rounds round_item
where confirmed.round_id is null
  and round_item.schedule_id = confirmed.schedule_id
  and round_item.sequence = 1;

insert into public.schedule_sessions (
    schedule_id, round_id, candidate_id, sequence, status, local_date,
    start_minute, end_minute, starts_at, ends_at, created_by, created_at, updated_at
)
select
    confirmed.schedule_id,
    confirmed.round_id,
    confirmed.slot_id,
    confirmed.sequence + 1,
    case when confirmed.status = 'held' then 'scheduled' else 'scheduled' end,
    confirmed.local_date,
    confirmed.start_minute,
    confirmed.end_minute,
    confirmed.starts_at,
    confirmed.ends_at,
    confirmed.created_by,
    confirmed.created_at,
    confirmed.updated_at
from public.schedule_confirmed_slots confirmed
where confirmed.round_id is not null
  and not exists (
    select 1 from public.schedule_sessions session_item
    where session_item.schedule_id = confirmed.schedule_id
      and session_item.sequence = confirmed.sequence + 1
);

update public.schedule_confirmed_slots confirmed
set session_id = session_item.id
from public.schedule_sessions session_item
where confirmed.session_id is null
  and session_item.schedule_id = confirmed.schedule_id
  and session_item.sequence = confirmed.sequence + 1;

alter table public.schedule_slots alter column round_id set not null;

create unique index if not exists schedule_rounds_one_active_idx
on public.schedule_rounds(schedule_id)
where status in ('draft', 'open');

create index if not exists schedule_rounds_schedule_sequence_idx
on public.schedule_rounds(schedule_id, sequence desc);
create index if not exists schedule_slots_round_order_idx
on public.schedule_slots(round_id, status, sort_order);
create index if not exists schedule_sessions_schedule_sequence_idx
on public.schedule_sessions(schedule_id, sequence);
create index if not exists schedule_sessions_round_sequence_idx
on public.schedule_sessions(round_id, sequence);
create index if not exists schedule_confirmed_slots_round_idx
on public.schedule_confirmed_slots(round_id, sequence);

create or replace function public.trpg_v6_seed_round()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    insert into public.schedule_rounds (schedule_id, sequence, status, target_minutes, opened_at)
    values (
        new.id,
        1,
        case when new.status = 'draft' then 'draft' else 'open' end,
        least(1800, greatest(0, coalesce(nullif(new.total_minutes, 0), new.session_minutes))),
        case when new.status = 'draft' then null else now() end
    )
    on conflict (schedule_id, sequence) do nothing;
    return new;
end;
$$;

drop trigger if exists trpg_v6_seed_round_after_schedule on public.schedules;
create trigger trpg_v6_seed_round_after_schedule
after insert on public.schedules
for each row execute function public.trpg_v6_seed_round();

create or replace function public.trpg_v6_touch_round()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trpg_v6_touch_round_before_write on public.schedule_rounds;
create trigger trpg_v6_touch_round_before_write
before update on public.schedule_rounds
for each row execute function public.trpg_v6_touch_round();

create or replace function public.trpg_v6_touch_session()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trpg_v6_touch_session_before_write on public.schedule_sessions;
create trigger trpg_v6_touch_session_before_write
before update on public.schedule_sessions
for each row execute function public.trpg_v6_touch_session();

create or replace function public.trpg_v6_guard_candidate_round()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare target_round public.schedule_rounds%rowtype;
begin
    if tg_op = 'INSERT' then
        select * into target_round from public.schedule_rounds where id = new.round_id;
    else
        select * into target_round from public.schedule_rounds where id = old.round_id;
    end if;
    if target_round.id is null then
        raise exception 'candidate round is required' using errcode = '23503';
    end if;
    if target_round.status not in ('draft', 'open') then
        raise exception 'candidate round is closed' using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' and new.round_id <> old.round_id then
        raise exception 'candidate round cannot change' using errcode = '22023';
    end if;
    return new;
end;
$$;

drop trigger if exists trpg_v6_guard_candidate_round_before_write on public.schedule_slots;
create trigger trpg_v6_guard_candidate_round_before_write
before insert or update on public.schedule_slots
for each row execute function public.trpg_v6_guard_candidate_round();

alter table public.schedule_rounds enable row level security;
alter table public.schedule_sessions enable row level security;

create policy schedule_rounds_member_select on public.schedule_rounds
for select to authenticated
using (exists (
    select 1 from public.schedule_participants participant
    where participant.schedule_id = schedule_rounds.schedule_id
      and participant.user_id = auth.uid()
));

create policy schedule_sessions_member_select on public.schedule_sessions
for select to authenticated
using (exists (
    select 1 from public.schedule_participants participant
    where participant.schedule_id = schedule_sessions.schedule_id
      and participant.user_id = auth.uid()
));

revoke all on table public.schedule_rounds from anon, authenticated;
revoke all on table public.schedule_sessions from anon, authenticated;
grant select on table public.schedule_rounds to authenticated;
grant select on table public.schedule_sessions to authenticated;

create or replace function public.trpg_v6_create_round(
    p_schedule_id uuid,
    p_title text default '',
    p_purpose text default '',
    p_target_minutes integer default null,
    p_open boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; next_sequence integer; target_minutes integer; saved_round public.schedule_rounds%rowtype;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    if exists (select 1 from public.schedule_rounds round_item where round_item.schedule_id = p_schedule_id and round_item.status in ('draft', 'open')) then
        raise exception 'an active round already exists' using errcode = '22023';
    end if;
    target_minutes = coalesce(p_target_minutes, nullif(target_schedule.total_minutes, 0), target_schedule.session_minutes);
    if target_minutes < 0 or target_minutes > 1800 then raise exception 'target duration must be between zero and 30 hours' using errcode = '22023'; end if;
    select coalesce(max(round_item.sequence), 0) + 1 into next_sequence from public.schedule_rounds round_item where round_item.schedule_id = p_schedule_id;
    insert into public.schedule_rounds (schedule_id, sequence, status, title, purpose, target_minutes, opened_at)
    values (p_schedule_id, next_sequence, case when p_open then 'open' else 'draft' end, left(trim(coalesce(p_title, '')), 120), left(trim(coalesce(p_purpose, '')), 400), target_minutes, case when p_open then now() else null end)
    returning * into saved_round;
    update public.schedules set status = 'collecting' where id = p_schedule_id;
    return jsonb_build_object('roundId', saved_round.id, 'sequence', saved_round.sequence, 'status', saved_round.status);
end;
$$;

create or replace function public.trpg_v6_add_candidates(
    p_schedule_id uuid,
    p_round_id uuid,
    p_candidates jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; target_round public.schedule_rounds%rowtype; candidate_item jsonb; starts_value timestamptz; ends_value timestamptz; candidate_time jsonb; next_order integer; candidate_count integer := 0;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if jsonb_typeof(coalesce(p_candidates, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_candidates, '[]'::jsonb)) < 1 or jsonb_array_length(p_candidates) > 120 then
        raise exception 'one to 120 candidates are required' using errcode = '22023';
    end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    select * into target_round from public.schedule_rounds round_item where round_item.id = p_round_id and round_item.schedule_id = p_schedule_id for update;
    if target_round.id is null or target_round.status not in ('draft', 'open') then raise exception 'round is not editable' using errcode = '22023'; end if;
    select coalesce(max(slot.sort_order), -1) + 1 into next_order from public.schedule_slots slot where slot.schedule_id = p_schedule_id;
    for candidate_item in select value from jsonb_array_elements(p_candidates) loop
        begin
            starts_value = nullif(candidate_item ->> 'startsAt', '')::timestamptz;
            ends_value = nullif(candidate_item ->> 'endsAt', '')::timestamptz;
        exception when others then
            raise exception 'invalid candidate time' using errcode = '22023';
        end;
        candidate_time = public.trpg_v5_candidate_times(target_schedule, starts_value, ends_value);
        insert into public.schedule_slots (schedule_id, round_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order, label, status, revision)
        values (p_schedule_id, p_round_id, (candidate_time ->> 'localDate')::date, (candidate_time ->> 'startMinute')::integer, (candidate_time ->> 'endMinute')::integer, starts_value, ends_value, next_order, left(trim(coalesce(candidate_item ->> 'label', '')), 120), 'active', 1);
        next_order = next_order + 1;
        candidate_count = candidate_count + 1;
    end loop;
    if target_round.status = 'draft' then update public.schedule_rounds set status = 'open', opened_at = coalesce(opened_at, now()) where id = target_round.id; end if;
    update public.schedules set status = 'collecting' where id = p_schedule_id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'roundId', p_round_id, 'candidateCount', candidate_count);
end;
$$;

create or replace function public.trpg_v2_add_candidates(p_schedule_id uuid, p_candidates jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_round uuid;
begin
    select id into target_round from public.schedule_rounds where schedule_id = p_schedule_id and status in ('draft', 'open') order by sequence desc limit 1;
    if target_round is null then raise exception 'open a new round before adding candidates' using errcode = '22023'; end if;
    return public.trpg_v6_add_candidates(p_schedule_id, target_round, p_candidates);
end;
$$;

create or replace function public.trpg_v2_add_candidate(p_schedule_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_label text default '')
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
    return public.trpg_v2_add_candidates(p_schedule_id, jsonb_build_array(jsonb_build_object('startsAt', p_starts_at, 'endsAt', p_ends_at, 'label', p_label)));
end;
$$;

create or replace function public.trpg_v5_update_candidate(p_schedule_id uuid, p_slot_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_label text default '')
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; target_slot public.schedule_slots%rowtype; candidate_time jsonb; replacement_slot public.schedule_slots%rowtype; next_order integer; stale_count integer; date_changed boolean; target_label text;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    select * into target_slot from public.schedule_slots slot where slot.id = p_slot_id and slot.schedule_id = p_schedule_id for update;
    if target_slot.id is null or target_slot.status <> 'active' then raise exception 'candidate is not active' using errcode = 'P0002'; end if;
    if exists (select 1 from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = p_schedule_id and confirmed.slot_id = p_slot_id) then raise exception 'confirmed candidate cannot be edited' using errcode = '22023'; end if;
    candidate_time = public.trpg_v5_candidate_times(target_schedule, p_starts_at, p_ends_at);
    date_changed = (candidate_time ->> 'localDate')::date <> target_slot.local_date;
    target_label = left(coalesce(nullif(trim(p_label), ''), target_slot.label), 120);
    select count(*) into stale_count from public.schedule_responses response where response.slot_id = target_slot.id;
    if not date_changed and target_slot.starts_at = p_starts_at and target_slot.ends_at = p_ends_at and target_slot.label is not distinct from target_label then
        return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', target_slot.id, 'dateChanged', false, 'changed', false, 'revision', target_slot.revision, 'staleResponseCount', 0);
    end if;
    if date_changed then
        select coalesce(max(slot.sort_order), -1) + 1 into next_order from public.schedule_slots slot where slot.schedule_id = p_schedule_id;
        update public.schedule_slots set status = 'retired', retired_at = now(), retired_by = auth.uid(), updated_at = now() where id = target_slot.id;
        insert into public.schedule_slots (schedule_id, round_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order, label, status, revision)
        values (p_schedule_id, target_slot.round_id, (candidate_time ->> 'localDate')::date, (candidate_time ->> 'startMinute')::integer, (candidate_time ->> 'endMinute')::integer, p_starts_at, p_ends_at, next_order, target_label, 'active', 1)
        returning * into replacement_slot;
        return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', replacement_slot.id, 'retiredSlotId', target_slot.id, 'dateChanged', true, 'staleResponseCount', stale_count);
    end if;
    update public.schedule_slots set local_date = (candidate_time ->> 'localDate')::date, start_minute = (candidate_time ->> 'startMinute')::integer, end_minute = (candidate_time ->> 'endMinute')::integer, starts_at = p_starts_at, ends_at = p_ends_at, label = target_label, revision = target_slot.revision + 1, updated_at = now() where id = target_slot.id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', target_slot.id, 'dateChanged', false, 'revision', target_slot.revision + 1, 'staleResponseCount', stale_count);
end;
$$;

create or replace function public.trpg_v6_confirm_recommendation_plan(
    p_schedule_id uuid,
    p_round_id uuid,
    p_items jsonb,
    p_snapshot_at timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; target_round public.schedule_rounds%rowtype; item jsonb; target_slot public.schedule_slots%rowtype; required_participant public.schedule_participants%rowtype; participant_response public.schedule_responses%rowtype; start_value integer; end_value integer; latest_change timestamptz; confirmed_start timestamptz; confirmed_end timestamptz; next_session_sequence integer; next_confirmed_sequence integer; saved_session public.schedule_sessions%rowtype; seen_slots uuid[] := array[]::uuid[]; saved_items jsonb := '[]'::jsonb;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'plan must contain 1 to 50 items' using errcode = '22023'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    select * into target_round from public.schedule_rounds round_item where round_item.id = p_round_id and round_item.schedule_id = p_schedule_id for update;
    if target_round.id is null or target_round.status <> 'open' then raise exception 'round is not open for confirmation' using errcode = '22023'; end if;
    select max(change_at) into latest_change from (
        select slot.updated_at as change_at from public.schedule_slots slot where slot.round_id = p_round_id
        union all select participant.updated_at from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.role <> 'viewer'
        union all select response.updated_at from public.schedule_responses response join public.schedule_slots slot on slot.id = response.slot_id join public.schedule_participants participant on participant.id = response.participant_id where slot.round_id = p_round_id and participant.role <> 'viewer'
        union all select range_item.updated_at from public.schedule_response_ranges range_item join public.schedule_responses response on response.id = range_item.response_id join public.schedule_slots slot on slot.id = response.slot_id join public.schedule_participants participant on participant.id = response.participant_id where slot.round_id = p_round_id and participant.role <> 'viewer'
    ) changes;
    if p_snapshot_at is null or (latest_change is not null and date_trunc('milliseconds', latest_change) > date_trunc('milliseconds', p_snapshot_at)) then raise exception 'recommendation is stale; review the latest responses' using errcode = '40001'; end if;
    select coalesce(max(sequence), 0) + 1 into next_session_sequence from public.schedule_sessions where schedule_id = p_schedule_id;
    select coalesce(max(sequence), -1) + 1 into next_confirmed_sequence from public.schedule_confirmed_slots where schedule_id = p_schedule_id;
    for item in select value from jsonb_array_elements(p_items) loop
        target_slot.id = null;
        select * into target_slot from public.schedule_slots slot where slot.id = nullif(item ->> 'slotId', '')::uuid and slot.schedule_id = p_schedule_id and slot.round_id = p_round_id and slot.status = 'active' for update;
        start_value = nullif(item ->> 'startMinute', '')::integer; end_value = nullif(item ->> 'endMinute', '')::integer;
        if target_slot.id is null or target_slot.id = any(seen_slots) or start_value is null or end_value is null or start_value < target_slot.start_minute or end_value > target_slot.end_minute or end_value <= start_value then raise exception 'invalid plan candidate' using errcode = '22023'; end if;
        seen_slots = array_append(seen_slots, target_slot.id);
        confirmed_start = (target_slot.local_date::timestamp + make_interval(mins => start_value)) at time zone target_schedule.timezone;
        confirmed_end = (target_slot.local_date::timestamp + make_interval(mins => end_value)) at time zone target_schedule.timezone;
        for required_participant in select * from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.role <> 'viewer' order by participant.sort_order for update loop
            participant_response.id = null;
            select * into participant_response from public.schedule_responses response where response.schedule_id = p_schedule_id and response.participant_id = required_participant.id and response.slot_id = target_slot.id for update;
            if participant_response.id is null or participant_response.answer = 'no' or participant_response.candidate_revision <> target_slot.revision then raise exception 'recommendation has stale or unavailable required participants' using errcode = '40001'; end if;
            if participant_response.answer = 'maybe' and not exists (select 1 from public.schedule_response_ranges range_item where range_item.response_id = participant_response.id and range_item.start_minute <= start_value and range_item.end_minute >= end_value) then raise exception 'recommendation has uncertain required participants' using errcode = '40001'; end if;
            if required_participant.user_id is not null and exists (select 1 from public.schedule_confirmed_slots confirmed join public.schedule_participants other_participant on other_participant.schedule_id = confirmed.schedule_id and other_participant.user_id = required_participant.user_id where confirmed.schedule_id <> p_schedule_id and confirmed.status in ('held', 'confirmed') and confirmed.ends_at > confirmed_start and confirmed.starts_at < confirmed_end) then raise exception 'recommendation conflicts with another confirmed session' using errcode = '40001'; end if;
        end loop;
        insert into public.schedule_sessions (schedule_id, round_id, candidate_id, sequence, status, local_date, start_minute, end_minute, starts_at, ends_at, created_by)
        values (p_schedule_id, p_round_id, target_slot.id, next_session_sequence, 'scheduled', target_slot.local_date, start_value, end_value, confirmed_start, confirmed_end, auth.uid()) returning * into saved_session;
        insert into public.schedule_confirmed_slots (schedule_id, slot_id, round_id, session_id, sequence, status, local_date, start_minute, end_minute, starts_at, ends_at, created_by)
        values (p_schedule_id, target_slot.id, p_round_id, saved_session.id, next_confirmed_sequence, 'confirmed', target_slot.local_date, start_value, end_value, confirmed_start, confirmed_end, auth.uid());
        saved_items = saved_items || jsonb_build_array(jsonb_build_object('sessionId', saved_session.id, 'slotId', target_slot.id, 'startMinute', start_value, 'endMinute', end_value));
        next_session_sequence = next_session_sequence + 1;
        next_confirmed_sequence = next_confirmed_sequence + 1;
    end loop;
    update public.schedule_rounds set status = 'confirmed', confirmed_at = now() where id = p_round_id;
    update public.schedules set status = 'confirmed' where id = p_schedule_id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'roundId', p_round_id, 'sessions', saved_items);
end;
$$;

create or replace function public.trpg_v4_confirm_recommendation_plan(p_schedule_id uuid, p_items jsonb, p_snapshot_at timestamptz)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_round uuid;
begin
    select id into target_round from public.schedule_rounds where schedule_id = p_schedule_id and status = 'open' order by sequence desc limit 1;
    if target_round is null then raise exception 'round is not open for confirmation' using errcode = '22023'; end if;
    return public.trpg_v6_confirm_recommendation_plan(p_schedule_id, target_round, p_items, p_snapshot_at);
end;
$$;

create or replace function public.trpg_v32_confirm_recommendation(p_schedule_id uuid, p_slot_id uuid, p_start_minute integer, p_end_minute integer, p_snapshot_at timestamptz)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_round uuid;
begin
    select round_id into target_round from public.schedule_slots where id = p_slot_id and schedule_id = p_schedule_id;
    if target_round is null then raise exception 'candidate not found' using errcode = 'P0002'; end if;
    return public.trpg_v6_confirm_recommendation_plan(p_schedule_id, target_round, jsonb_build_array(jsonb_build_object('slotId', p_slot_id, 'startMinute', p_start_minute, 'endMinute', p_end_minute)), p_snapshot_at);
end;
$$;

create or replace function public.trpg_v6_update_session_status(p_schedule_id uuid, p_session_id uuid, p_status text, p_memo text default '')
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_session public.schedule_sessions%rowtype;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if p_status not in ('scheduled', 'completed', 'cancelled') then raise exception 'invalid session status' using errcode = '22023'; end if;
    if not exists (select 1 from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update) then raise exception 'owner access denied' using errcode = '28000'; end if;
    update public.schedule_sessions set status = p_status, memo = left(trim(coalesce(p_memo, '')), 400) where id = p_session_id and schedule_id = p_schedule_id returning * into target_session;
    if target_session.id is null then raise exception 'session not found' using errcode = 'P0002'; end if;
    return jsonb_build_object('sessionId', target_session.id, 'status', target_session.status);
end;
$$;

create or replace function public.trpg_v6_close_round(p_schedule_id uuid, p_round_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_round public.schedule_rounds%rowtype;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if not exists (select 1 from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update) then raise exception 'owner access denied' using errcode = '28000'; end if;
    update public.schedule_rounds set status = 'closed', closed_at = now() where id = p_round_id and schedule_id = p_schedule_id and status in ('draft', 'open', 'confirmed') returning * into target_round;
    if target_round.id is null then raise exception 'round cannot be closed' using errcode = '22023'; end if;
    return jsonb_build_object('roundId', target_round.id, 'status', target_round.status);
end;
$$;

create or replace function public.schedule_public_view(p_share_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; active_round public.schedule_rounds%rowtype; slot_payload jsonb; participant_payload jsonb; summary_payload jsonb; confirmed_payload jsonb; round_payload jsonb; session_payload jsonb;
begin
    select * into target_schedule from public.schedules schedule where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now();
    if target_schedule.id is null then return null; end if;
    select * into active_round from public.schedule_rounds round_item where round_item.schedule_id = target_schedule.id and round_item.status in ('draft', 'open') order by round_item.sequence desc limit 1;
    select coalesce(jsonb_agg(jsonb_build_object('id', slot.id, 'roundId', slot.round_id, 'localDate', slot.local_date, 'startMinute', slot.start_minute, 'endMinute', slot.end_minute, 'startsAt', slot.starts_at, 'endsAt', slot.ends_at, 'sortOrder', slot.sort_order, 'label', slot.label, 'status', slot.status, 'revision', slot.revision) order by slot.sort_order), '[]'::jsonb) into slot_payload from public.schedule_slots slot where slot.round_id = active_round.id and slot.status = 'active';
    select coalesce(jsonb_agg(jsonb_build_object('id', participant.id, 'displayName', participant.display_name, 'role', participant.role, 'required', participant.required, 'answered', exists (select 1 from public.schedule_responses response join public.schedule_slots slot on slot.id = response.slot_id where response.participant_id = participant.id and slot.round_id = active_round.id and slot.status = 'active' and response.candidate_revision = slot.revision)) order by participant.sort_order), '[]'::jsonb) into participant_payload from public.schedule_participants participant where participant.schedule_id = target_schedule.id;
    select coalesce(jsonb_agg(jsonb_build_object('slotId', slot.id, 'yes', coalesce(counts.yes_count, 0), 'maybe', coalesce(counts.maybe_count, 0), 'no', coalesce(counts.no_count, 0), 'answered', coalesce(counts.answered_count, 0), 'stale', coalesce(counts.stale_count, 0)) order by slot.sort_order), '[]'::jsonb) into summary_payload from public.schedule_slots slot left join lateral (select count(*) filter (where response.candidate_revision = slot.revision and response.answer = 'yes') as yes_count, count(*) filter (where response.candidate_revision = slot.revision and response.answer = 'maybe') as maybe_count, count(*) filter (where response.candidate_revision = slot.revision and response.answer = 'no') as no_count, count(*) filter (where response.candidate_revision = slot.revision) as answered_count, count(*) filter (where response.candidate_revision <> slot.revision) as stale_count from public.schedule_responses response where response.slot_id = slot.id) counts on true where slot.round_id = active_round.id and slot.status = 'active';
    select coalesce(jsonb_agg(jsonb_build_object('id', round_item.id, 'sequence', round_item.sequence, 'status', round_item.status, 'title', round_item.title, 'purpose', round_item.purpose, 'targetMinutes', round_item.target_minutes, 'createdAt', round_item.created_at, 'openedAt', round_item.opened_at, 'confirmedAt', round_item.confirmed_at, 'closedAt', round_item.closed_at) order by round_item.sequence desc), '[]'::jsonb) into round_payload from public.schedule_rounds round_item where round_item.schedule_id = target_schedule.id;
    select coalesce(jsonb_agg(jsonb_build_object('id', session_item.id, 'roundId', session_item.round_id, 'candidateId', session_item.candidate_id, 'sequence', session_item.sequence, 'status', session_item.status, 'localDate', session_item.local_date, 'startMinute', session_item.start_minute, 'endMinute', session_item.end_minute, 'startsAt', session_item.starts_at, 'endsAt', session_item.ends_at, 'memo', session_item.memo) order by session_item.sequence), '[]'::jsonb) into session_payload from public.schedule_sessions session_item where session_item.schedule_id = target_schedule.id;
    select coalesce(jsonb_agg(jsonb_build_object('id', confirmed.id, 'roundId', confirmed.round_id, 'sessionId', confirmed.session_id, 'slotId', confirmed.slot_id, 'sequence', confirmed.sequence, 'status', confirmed.status, 'localDate', confirmed.local_date, 'startMinute', confirmed.start_minute, 'endMinute', confirmed.end_minute, 'startsAt', confirmed.starts_at, 'endsAt', confirmed.ends_at) order by confirmed.sequence), '[]'::jsonb) into confirmed_payload from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = target_schedule.id;
    return jsonb_build_object('schedule', jsonb_build_object('id', target_schedule.id, 'shareId', target_schedule.share_id, 'title', target_schedule.title, 'description', target_schedule.description, 'timezone', target_schedule.timezone, 'status', target_schedule.status, 'totalMinutes', target_schedule.total_minutes, 'sessionMinutes', target_schedule.session_minutes, 'updatedAt', target_schedule.updated_at, 'lastActivityAt', target_schedule.last_activity_at, 'expiresAt', target_schedule.expires_at), 'rounds', round_payload, 'sessions', session_payload, 'slots', slot_payload, 'participants', participant_payload, 'summaries', summary_payload, 'confirmedSlots', confirmed_payload, 'responses', '[]'::jsonb);
end;
$$;

create or replace function public.schedule_account_view(p_share_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; public_payload jsonb; own_participant public.schedule_participants%rowtype; own_responses jsonb;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now();
    if target_schedule.id is null then return null; end if;
    public_payload = public.schedule_public_view(p_share_id);
    select * into own_participant from public.schedule_participants participant where participant.schedule_id = target_schedule.id and participant.user_id = auth.uid();
    if own_participant.id is null then return public_payload; end if;
    select coalesce(jsonb_agg(jsonb_build_object('slotId', response.slot_id, 'participantId', response.participant_id, 'answer', response.answer, 'note', response.note, 'candidateRevision', response.candidate_revision, 'stale', response.candidate_revision <> slot.revision, 'ranges', coalesce((select jsonb_agg(jsonb_build_object('startMinute', range_item.start_minute, 'endMinute', range_item.end_minute, 'answer', range_item.answer, 'sortOrder', range_item.sort_order) order by range_item.sort_order) from public.schedule_response_ranges range_item where range_item.response_id = response.id), '[]'::jsonb)) order by response.updated_at), '[]'::jsonb) into own_responses from public.schedule_responses response join public.schedule_slots slot on slot.id = response.slot_id join public.schedule_rounds round_item on round_item.id = slot.round_id where response.schedule_id = target_schedule.id and response.participant_id = own_participant.id and slot.status = 'active' and round_item.status = 'open';
    return public_payload || jsonb_build_object('schedule', (public_payload -> 'schedule') || case when target_schedule.owner_id = auth.uid() then jsonb_build_object('ownerId', target_schedule.owner_id) else '{}'::jsonb end, 'me', jsonb_build_object('participantId', own_participant.id, 'userId', auth.uid(), 'displayName', own_participant.display_name, 'role', own_participant.role, 'required', own_participant.required), 'responses', own_responses);
end;
$$;

create or replace function public.schedule_guest_view(p_share_id text, p_participant_id uuid, p_guest_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule_id uuid; public_payload jsonb; own_payload jsonb;
begin
    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token);
    public_payload = public.schedule_public_view(p_share_id);
    select jsonb_build_object('participantId', participant.id, 'displayName', participant.display_name, 'role', participant.role, 'responses', coalesce(jsonb_agg(jsonb_build_object('slotId', response.slot_id, 'answer', response.answer, 'note', response.note, 'candidateRevision', response.candidate_revision, 'stale', response.candidate_revision <> slot.revision, 'ranges', coalesce((select jsonb_agg(jsonb_build_object('startMinute', range_item.start_minute, 'endMinute', range_item.end_minute, 'answer', range_item.answer, 'sortOrder', range_item.sort_order) order by range_item.sort_order) from public.schedule_response_ranges range_item where range_item.response_id = response.id), '[]'::jsonb)) order by response.updated_at) filter (where response.id is not null and slot.id is not null and round_item.id is not null), '[]'::jsonb)) into own_payload from public.schedule_participants participant left join public.schedule_responses response on response.participant_id = participant.id left join public.schedule_slots slot on slot.id = response.slot_id and slot.status = 'active' left join public.schedule_rounds round_item on round_item.id = slot.round_id and round_item.status = 'open' where participant.id = p_participant_id and participant.schedule_id = target_schedule_id group by participant.id, participant.display_name, participant.role;
    return public_payload || jsonb_build_object('me', own_payload);
end;
$$;

create or replace function public.schedule_account_upsert_response(p_share_id text, p_slot_id uuid, p_answer text, p_note text default '', p_ranges jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule public.schedules%rowtype; target_slot public.schedule_slots%rowtype; target_participant public.schedule_participants%rowtype; response_uuid uuid;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if p_answer not in ('yes', 'maybe', 'no') then raise exception 'invalid answer' using errcode = '22023'; end if;
    if jsonb_typeof(coalesce(p_ranges, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_ranges, '[]'::jsonb)) > 4 then raise exception 'invalid response ranges' using errcode = '22023'; end if;
    select * into target_schedule from public.schedules schedule where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now(); if target_schedule.id is null then raise exception 'schedule is not available' using errcode = '28000'; end if;
    select * into target_participant from public.schedule_participants participant where participant.schedule_id = target_schedule.id and participant.user_id = auth.uid(); if target_participant.id is null then raise exception 'participant access denied' using errcode = '28000'; end if;
    select slot.* into target_slot from public.schedule_slots slot join public.schedule_rounds round_item on round_item.id = slot.round_id where slot.id = p_slot_id and slot.schedule_id = target_schedule.id and slot.status = 'active' and round_item.status = 'open'; if target_slot.id is null then raise exception 'candidate is not available for the open round' using errcode = 'P0002'; end if;
    insert into public.schedule_responses (schedule_id, participant_id, slot_id, answer, note, candidate_revision) values (target_schedule.id, target_participant.id, p_slot_id, p_answer, left(trim(coalesce(p_note, '')), 120), target_slot.revision) on conflict (participant_id, slot_id) do update set answer = excluded.answer, note = excluded.note, candidate_revision = excluded.candidate_revision, updated_at = now() returning id into response_uuid;
    delete from public.schedule_response_ranges where response_id = response_uuid; perform public.trpg_v5_save_response_ranges(response_uuid, target_slot, p_ranges);
    return public.schedule_account_view(p_share_id);
end;
$$;

create or replace function public.schedule_guest_upsert_response(p_share_id text, p_participant_id uuid, p_guest_token text, p_slot_id uuid, p_answer text, p_note text default '', p_ranges jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare target_schedule_id uuid; target_slot public.schedule_slots%rowtype; response_uuid uuid;
begin
    if p_answer not in ('yes', 'maybe', 'no') then raise exception 'invalid answer' using errcode = '22023'; end if;
    if jsonb_typeof(coalesce(p_ranges, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_ranges, '[]'::jsonb)) > 4 then raise exception 'invalid response ranges' using errcode = '22023'; end if;
    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token);
    select slot.* into target_slot from public.schedule_slots slot join public.schedule_rounds round_item on round_item.id = slot.round_id where slot.id = p_slot_id and slot.schedule_id = target_schedule_id and slot.status = 'active' and round_item.status = 'open'; if target_slot.id is null then raise exception 'candidate is not available for the open round' using errcode = 'P0002'; end if;
    insert into public.schedule_responses (schedule_id, participant_id, slot_id, answer, note, candidate_revision) values (target_schedule_id, p_participant_id, p_slot_id, p_answer, left(trim(coalesce(p_note, '')), 120), target_slot.revision) on conflict (participant_id, slot_id) do update set answer = excluded.answer, note = excluded.note, candidate_revision = excluded.candidate_revision, updated_at = now() returning id into response_uuid;
    delete from public.schedule_response_ranges where response_id = response_uuid; perform public.trpg_v5_save_response_ranges(response_uuid, target_slot, p_ranges);
    return public.schedule_guest_view(p_share_id, p_participant_id, p_guest_token);
end;
$$;

revoke all on function public.trpg_v6_create_round(uuid, text, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.trpg_v6_add_candidates(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v6_confirm_recommendation_plan(uuid, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v6_update_session_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.trpg_v6_close_round(uuid, uuid) from public, anon, authenticated;
revoke all on function public.trpg_v6_seed_round() from public, anon, authenticated;
revoke all on function public.trpg_v6_touch_round() from public, anon, authenticated;
revoke all on function public.trpg_v6_touch_session() from public, anon, authenticated;
revoke all on function public.trpg_v6_guard_candidate_round() from public, anon, authenticated;
revoke all on function public.trpg_v2_add_candidates(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.trpg_v5_update_candidate(uuid, uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.trpg_v4_confirm_recommendation_plan(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v32_confirm_recommendation(uuid, uuid, integer, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.schedule_public_view(text) from public, anon, authenticated;
revoke all on function public.schedule_account_view(text) from public, anon, authenticated;
revoke all on function public.schedule_guest_view(text, uuid, text) from public, anon, authenticated;
revoke all on function public.schedule_account_upsert_response(text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.schedule_guest_upsert_response(text, uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.trpg_v6_create_round(uuid, text, text, integer, boolean) to authenticated;
grant execute on function public.trpg_v6_add_candidates(uuid, uuid, jsonb) to authenticated;
grant execute on function public.trpg_v6_confirm_recommendation_plan(uuid, uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.trpg_v6_update_session_status(uuid, uuid, text, text) to authenticated;
grant execute on function public.trpg_v6_close_round(uuid, uuid) to authenticated;
grant execute on function public.trpg_v2_add_candidates(uuid, jsonb) to authenticated;
grant execute on function public.trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.trpg_v5_update_candidate(uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.trpg_v4_confirm_recommendation_plan(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.trpg_v32_confirm_recommendation(uuid, uuid, integer, integer, timestamptz) to authenticated;
grant execute on function public.schedule_public_view(text) to anon, authenticated;
grant execute on function public.schedule_account_view(text) to authenticated;
grant execute on function public.schedule_guest_view(text, uuid, text) to anon, authenticated;
grant execute on function public.schedule_account_upsert_response(text, uuid, text, text, jsonb) to authenticated;
grant execute on function public.schedule_guest_upsert_response(text, uuid, text, uuid, text, text, jsonb) to anon, authenticated;
