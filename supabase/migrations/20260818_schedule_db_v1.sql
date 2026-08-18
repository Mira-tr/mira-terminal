-- RELMUA Schedule DB v1
-- This migration is prepared for review. Do not apply it to production until
-- the Schedule DB v1 security review is complete.

create extension if not exists pgcrypto with schema public;

create or replace function public.schedule_generate_token(byte_count integer default 32)
returns text
language sql
volatile
set search_path = pg_catalog, public
as $$
    select translate(rtrim(encode(public.gen_random_bytes(greatest(byte_count, 32)), 'base64'), '='), '+/', '-_');
$$;

create or replace function public.schedule_hash_token(raw_token text)
returns bytea
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
    select public.digest(convert_to(raw_token, 'UTF8'), 'sha256');
$$;

create table public.schedules (
    id uuid primary key default public.gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    share_id text not null unique default public.schedule_generate_token(32),
    share_enabled boolean not null default true,
    title text not null,
    description text not null default '',
    timezone text not null default 'Asia/Tokyo',
    status text not null default 'collecting',
    total_minutes integer not null default 0,
    session_minutes integer not null default 180,
    max_participants integer not null default 50,
    schema_version integer not null default 1,
    last_activity_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '1 year'),
    constraint schedules_title_length check (char_length(title) between 1 and 120),
    constraint schedules_description_length check (char_length(description) <= 2000),
    constraint schedules_timezone_length check (char_length(timezone) between 1 and 80),
    constraint schedules_status_check check (status in ('draft', 'collecting', 'ready', 'held', 'confirmed', 'archived', 'expired')),
    constraint schedules_minutes_check check (total_minutes >= 0 and session_minutes between 1 and 1800),
    constraint schedules_participant_limit_check check (max_participants between 1 and 50),
    constraint schedules_schema_version_check check (schema_version = 1),
    constraint schedules_share_id_entropy_check check (char_length(share_id) >= 32)
);

create table public.schedule_slots (
    id uuid primary key default public.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    local_date date not null,
    start_minute integer not null,
    end_minute integer not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    sort_order integer not null,
    label text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_slots_minute_check check (
        start_minute >= 0
        and end_minute > start_minute
        and end_minute <= 1800
    ),
    constraint schedule_slots_time_check check (ends_at > starts_at),
    constraint schedule_slots_label_length check (char_length(label) <= 120),
    constraint schedule_slots_sort_order_check check (sort_order >= 0),
    unique (schedule_id, id),
    unique (schedule_id, sort_order),
    unique (schedule_id, local_date, start_minute, end_minute)
);

create table public.schedule_participants (
    id uuid primary key default public.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    display_name text not null,
    role text not null default 'participant',
    required boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_participants_name_length check (char_length(display_name) between 1 and 80),
    constraint schedule_participants_role_check check (role in ('owner', 'participant', 'guest', 'viewer')),
    constraint schedule_participants_sort_order_check check (sort_order >= 0),
    unique (schedule_id, id)
);

create unique index schedule_participants_schedule_user_unique
on public.schedule_participants(schedule_id, user_id)
where user_id is not null;

create table public.schedule_guest_credentials (
    participant_id uuid primary key references public.schedule_participants(id) on delete cascade,
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    token_hash bytea not null,
    created_at timestamptz not null default now(),
    last_used_at timestamptz not null default now(),
    expires_at timestamptz not null,
    unique (schedule_id, token_hash),
    foreign key (schedule_id, participant_id)
        references public.schedule_participants(schedule_id, id)
        on delete cascade
);

create table public.schedule_responses (
    id uuid primary key default public.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    participant_id uuid not null,
    slot_id uuid not null,
    answer text not null,
    note text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_responses_answer_check check (answer in ('yes', 'maybe', 'no')),
    constraint schedule_responses_note_length check (char_length(note) <= 120),
    unique (participant_id, slot_id),
    unique (schedule_id, id),
    foreign key (schedule_id, participant_id)
        references public.schedule_participants(schedule_id, id)
        on delete cascade,
    foreign key (schedule_id, slot_id)
        references public.schedule_slots(schedule_id, id)
        on delete cascade
);

create table public.schedule_response_ranges (
    id uuid primary key default public.gen_random_uuid(),
    response_id uuid not null references public.schedule_responses(id) on delete cascade,
    start_minute integer not null,
    end_minute integer not null,
    answer text,
    sort_order integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_response_ranges_minute_check check (
        start_minute >= 0
        and end_minute > start_minute
        and end_minute <= 1800
    ),
    constraint schedule_response_ranges_answer_check check (answer is null or answer in ('yes', 'maybe', 'no')),
    constraint schedule_response_ranges_sort_order_check check (sort_order between 0 and 3),
    unique (response_id, sort_order)
);

create table public.schedule_confirmed_slots (
    id uuid primary key default public.gen_random_uuid(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    slot_id uuid references public.schedule_slots(id) on delete set null,
    sequence integer not null,
    status text not null,
    local_date date not null,
    start_minute integer not null,
    end_minute integer not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint schedule_confirmed_slots_status_check check (status in ('held', 'confirmed')),
    constraint schedule_confirmed_slots_minute_check check (
        start_minute >= 0
        and end_minute > start_minute
        and end_minute <= 1800
    ),
    constraint schedule_confirmed_slots_time_check check (ends_at > starts_at),
    constraint schedule_confirmed_slots_sequence_check check (sequence >= 0),
    unique (schedule_id, sequence)
);

create index schedules_owner_idx on public.schedules(owner_id);
create index schedules_share_id_idx on public.schedules(share_id);
create index schedules_expires_at_idx on public.schedules(expires_at);
create index schedule_slots_schedule_order_idx on public.schedule_slots(schedule_id, sort_order);
create index schedule_participants_schedule_order_idx on public.schedule_participants(schedule_id, sort_order);
create index schedule_responses_schedule_slot_idx on public.schedule_responses(schedule_id, slot_id);
create index schedule_responses_participant_idx on public.schedule_responses(participant_id);
create index schedule_ranges_response_idx on public.schedule_response_ranges(response_id, sort_order);
create index schedule_confirmed_slots_schedule_idx on public.schedule_confirmed_slots(schedule_id, sequence);

create or replace function public.schedule_set_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        new.created_at = coalesce(new.created_at, now());
    end if;

    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.schedule_set_root_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        new.created_at = coalesce(new.created_at, now());
        new.last_activity_at = coalesce(new.last_activity_at, now());
    else
        new.last_activity_at = now();
    end if;

    new.updated_at = now();
    new.expires_at = new.last_activity_at + interval '1 year';
    return new;
end;
$$;

create or replace function public.schedule_touch(schedule_uuid uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    update public.schedules
    set last_activity_at = now()
    where id = schedule_uuid;
end;
$$;

create or replace function public.schedule_touch_from_child()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule_id uuid;
begin
    target_schedule_id = coalesce(new.schedule_id, old.schedule_id);
    perform public.schedule_touch(target_schedule_id);
    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

create or replace function public.schedule_touch_from_range()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule_id uuid;
begin
    select response.schedule_id
    into target_schedule_id
    from public.schedule_responses response
    where response.id = coalesce(new.response_id, old.response_id);

    perform public.schedule_touch(target_schedule_id);
    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

create trigger schedules_set_root_timestamps
before insert or update on public.schedules
for each row execute function public.schedule_set_root_timestamps();

create trigger schedule_slots_set_timestamps
before insert or update on public.schedule_slots
for each row execute function public.schedule_set_timestamps();

create trigger schedule_participants_set_timestamps
before insert or update on public.schedule_participants
for each row execute function public.schedule_set_timestamps();

create trigger schedule_responses_set_timestamps
before insert or update on public.schedule_responses
for each row execute function public.schedule_set_timestamps();

create trigger schedule_response_ranges_set_timestamps
before insert or update on public.schedule_response_ranges
for each row execute function public.schedule_set_timestamps();

create trigger schedule_confirmed_slots_set_timestamps
before insert or update on public.schedule_confirmed_slots
for each row execute function public.schedule_set_timestamps();

create trigger schedule_slots_touch_schedule
after insert or update or delete on public.schedule_slots
for each row execute function public.schedule_touch_from_child();

create trigger schedule_participants_touch_schedule
after insert or update or delete on public.schedule_participants
for each row execute function public.schedule_touch_from_child();

create trigger schedule_responses_touch_schedule
after insert or update or delete on public.schedule_responses
for each row execute function public.schedule_touch_from_child();

create trigger schedule_response_ranges_touch_schedule
after insert or update or delete on public.schedule_response_ranges
for each row execute function public.schedule_touch_from_range();

create trigger schedule_confirmed_slots_touch_schedule
after insert or update or delete on public.schedule_confirmed_slots
for each row execute function public.schedule_touch_from_child();

create or replace function public.schedule_assert_guest(
    p_share_id text,
    p_participant_id uuid,
    p_guest_token text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    found_schedule_id uuid;
begin
    if p_share_id is null or char_length(p_share_id) < 32 then
        raise exception 'invalid share id' using errcode = '22023';
    end if;

    if p_guest_token is null or char_length(p_guest_token) < 32 then
        raise exception 'invalid guest token' using errcode = '28000';
    end if;

    select schedule.id
    into found_schedule_id
    from public.schedules schedule
    join public.schedule_guest_credentials credential
        on credential.schedule_id = schedule.id
    where schedule.share_id = p_share_id
      and schedule.share_enabled = true
      and schedule.expires_at > now()
      and schedule.status <> 'expired'
      and credential.participant_id = p_participant_id
      and credential.token_hash = public.schedule_hash_token(p_guest_token);

    if found_schedule_id is null then
        raise exception 'guest access denied' using errcode = '28000';
    end if;

    update public.schedule_guest_credentials
    set last_used_at = now()
    where participant_id = p_participant_id;

    return found_schedule_id;
end;
$$;

create or replace function public.schedule_public_view(p_share_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    with target_schedule as (
        select *
        from public.schedules
        where share_id = p_share_id
          and share_enabled = true
          and expires_at > now()
          and status <> 'expired'
        limit 1
    ),
    slot_rows as (
        select coalesce(jsonb_agg(jsonb_build_object(
            'id', slot.id,
            'localDate', slot.local_date,
            'startMinute', slot.start_minute,
            'endMinute', slot.end_minute,
            'startsAt', slot.starts_at,
            'endsAt', slot.ends_at,
            'sortOrder', slot.sort_order,
            'label', slot.label
        ) order by slot.sort_order), '[]'::jsonb) as slots
        from public.schedule_slots slot
        join target_schedule schedule on schedule.id = slot.schedule_id
    ),
    participant_rows as (
        select coalesce(jsonb_agg(jsonb_build_object(
            'displayName', participant.display_name,
            'role', participant.role,
            'required', participant.required,
            'answered', exists (
                select 1
                from public.schedule_responses response
                where response.participant_id = participant.id
            )
        ) order by participant.sort_order), '[]'::jsonb) as participants
        from public.schedule_participants participant
        join target_schedule schedule on schedule.id = participant.schedule_id
    ),
    response_summary as (
        select coalesce(jsonb_agg(jsonb_build_object(
            'slotId', slot.id,
            'yes', count(response.id) filter (where response.answer = 'yes'),
            'maybe', count(response.id) filter (where response.answer = 'maybe'),
            'no', count(response.id) filter (where response.answer = 'no'),
            'answered', count(response.id),
            'unknown', greatest(0, (
                select count(*)
                from public.schedule_participants participant
                where participant.schedule_id = schedule.id
            ) - count(response.id))
        ) order by slot.sort_order), '[]'::jsonb) as summaries
        from target_schedule schedule
        join public.schedule_slots slot on slot.schedule_id = schedule.id
        left join public.schedule_responses response on response.slot_id = slot.id
        group by schedule.id
    ),
    confirmed_rows as (
        select coalesce(jsonb_agg(jsonb_build_object(
            'id', confirmed.id,
            'slotId', confirmed.slot_id,
            'sequence', confirmed.sequence,
            'status', confirmed.status,
            'localDate', confirmed.local_date,
            'startMinute', confirmed.start_minute,
            'endMinute', confirmed.end_minute,
            'startsAt', confirmed.starts_at,
            'endsAt', confirmed.ends_at
        ) order by confirmed.sequence), '[]'::jsonb) as confirmed
        from public.schedule_confirmed_slots confirmed
        join target_schedule schedule on schedule.id = confirmed.schedule_id
    )
    select case
        when not exists (select 1 from target_schedule) then null
        else jsonb_build_object(
            'schedule', (
                select jsonb_build_object(
                    'id', schedule.id,
                    'shareId', schedule.share_id,
                    'title', schedule.title,
                    'description', schedule.description,
                    'timezone', schedule.timezone,
                    'status', schedule.status,
                    'totalMinutes', schedule.total_minutes,
                    'sessionMinutes', schedule.session_minutes
                )
                from target_schedule schedule
            ),
            'slots', (select slots from slot_rows),
            'participants', (select participants from participant_rows),
            'summaries', (select summaries from response_summary),
            'confirmedSlots', (select confirmed from confirmed_rows)
        )
    end;
$$;

create or replace function public.schedule_guest_join(
    p_share_id text,
    p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    participant_count integer;
    new_participant_id uuid;
    raw_guest_token text;
begin
    p_display_name = trim(coalesce(p_display_name, ''));

    if char_length(p_display_name) < 1 or char_length(p_display_name) > 80 then
        raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
    end if;

    select *
    into target_schedule
    from public.schedules
    where share_id = p_share_id
      and share_enabled = true
      and expires_at > now()
      and status <> 'expired'
    limit 1;

    if target_schedule.id is null then
        raise exception 'schedule not found' using errcode = 'P0002';
    end if;

    select count(*)
    into participant_count
    from public.schedule_participants
    where schedule_id = target_schedule.id;

    if participant_count >= target_schedule.max_participants then
        raise exception 'participant limit exceeded' using errcode = '54000';
    end if;

    new_participant_id = public.gen_random_uuid();
    raw_guest_token = public.schedule_generate_token(32);

    insert into public.schedule_participants (
        id,
        schedule_id,
        display_name,
        role,
        required,
        sort_order
    )
    values (
        new_participant_id,
        target_schedule.id,
        p_display_name,
        'guest',
        false,
        participant_count
    );

    insert into public.schedule_guest_credentials (
        participant_id,
        schedule_id,
        token_hash,
        expires_at
    )
    values (
        new_participant_id,
        target_schedule.id,
        public.schedule_hash_token(raw_guest_token),
        target_schedule.expires_at
    );

    return jsonb_build_object(
        'participantId', new_participant_id,
        'guestToken', raw_guest_token,
        'secretEditPath', concat('#/s/', target_schedule.share_id, '/me/', new_participant_id, '.', raw_guest_token),
        'view', public.schedule_guest_view(target_schedule.share_id, new_participant_id, raw_guest_token)
    );
end;
$$;

create or replace function public.schedule_guest_view(
    p_share_id text,
    p_participant_id uuid,
    p_guest_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule_id uuid;
    public_payload jsonb;
    own_payload jsonb;
begin
    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token);
    public_payload = public.schedule_public_view(p_share_id);

    select jsonb_build_object(
        'participantId', participant.id,
        'displayName', participant.display_name,
        'responses', coalesce(jsonb_agg(jsonb_build_object(
            'slotId', response.slot_id,
            'answer', response.answer,
            'note', response.note,
            'ranges', coalesce((
                select jsonb_agg(jsonb_build_object(
                    'startMinute', range_item.start_minute,
                    'endMinute', range_item.end_minute,
                    'answer', range_item.answer,
                    'sortOrder', range_item.sort_order
                ) order by range_item.sort_order)
                from public.schedule_response_ranges range_item
                where range_item.response_id = response.id
            ), '[]'::jsonb)
        ) order by response.updated_at) filter (where response.id is not null), '[]'::jsonb)
    )
    into own_payload
    from public.schedule_participants participant
    left join public.schedule_responses response
        on response.participant_id = participant.id
    where participant.id = p_participant_id
      and participant.schedule_id = target_schedule_id
    group by participant.id, participant.display_name;

    return public_payload || jsonb_build_object('me', own_payload);
end;
$$;

create or replace function public.schedule_guest_update_name(
    p_share_id text,
    p_participant_id uuid,
    p_guest_token text,
    p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule_id uuid;
begin
    p_display_name = trim(coalesce(p_display_name, ''));

    if char_length(p_display_name) < 1 or char_length(p_display_name) > 80 then
        raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
    end if;

    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token);

    update public.schedule_participants
    set display_name = p_display_name
    where id = p_participant_id
      and schedule_id = target_schedule_id;

    return public.schedule_guest_view(p_share_id, p_participant_id, p_guest_token);
end;
$$;

create or replace function public.schedule_guest_upsert_response(
    p_share_id text,
    p_participant_id uuid,
    p_guest_token text,
    p_slot_id uuid,
    p_answer text,
    p_note text default '',
    p_ranges jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule_id uuid;
    target_slot public.schedule_slots%rowtype;
    response_uuid uuid;
    range_item jsonb;
    range_start integer;
    range_end integer;
    range_answer text;
    range_index integer = 0;
begin
    p_note = left(trim(coalesce(p_note, '')), 120);

    if p_answer not in ('yes', 'maybe', 'no') then
        raise exception 'invalid answer' using errcode = '22023';
    end if;

    if jsonb_typeof(coalesce(p_ranges, '[]'::jsonb)) <> 'array' then
        raise exception 'ranges must be an array' using errcode = '22023';
    end if;

    if jsonb_array_length(coalesce(p_ranges, '[]'::jsonb)) > 4 then
        raise exception 'too many ranges' using errcode = '22023';
    end if;

    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token);

    select *
    into target_slot
    from public.schedule_slots
    where id = p_slot_id
      and schedule_id = target_schedule_id;

    if target_slot.id is null then
        raise exception 'slot not found' using errcode = 'P0002';
    end if;

    insert into public.schedule_responses (
        schedule_id,
        participant_id,
        slot_id,
        answer,
        note
    )
    values (
        target_schedule_id,
        p_participant_id,
        p_slot_id,
        p_answer,
        p_note
    )
    on conflict (participant_id, slot_id)
    do update set
        answer = excluded.answer,
        note = excluded.note,
        updated_at = now()
    returning id into response_uuid;

    delete from public.schedule_response_ranges
    where response_id = response_uuid;

    for range_item in
        select value from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb))
    loop
        range_start = (range_item ->> 'startMinute')::integer;
        range_end = (range_item ->> 'endMinute')::integer;
        range_answer = nullif(range_item ->> 'answer', '');

        if range_start is null or range_end is null then
            raise exception 'invalid range' using errcode = '22023';
        end if;

        if range_start < target_slot.start_minute or range_end > target_slot.end_minute or range_end <= range_start then
            raise exception 'range outside slot' using errcode = '22023';
        end if;

        if range_answer is not null and range_answer not in ('yes', 'maybe', 'no') then
            raise exception 'invalid range answer' using errcode = '22023';
        end if;

        if exists (
            select 1
            from public.schedule_response_ranges existing
            where existing.response_id = response_uuid
              and not (existing.end_minute <= range_start or existing.start_minute >= range_end)
        ) then
            raise exception 'overlapping ranges' using errcode = '22023';
        end if;

        insert into public.schedule_response_ranges (
            response_id,
            start_minute,
            end_minute,
            answer,
            sort_order
        )
        values (
            response_uuid,
            range_start,
            range_end,
            range_answer,
            range_index
        );

        range_index = range_index + 1;
    end loop;

    return public.schedule_guest_view(p_share_id, p_participant_id, p_guest_token);
end;
$$;

create or replace function public.schedule_owner_confirm_slots(
    p_schedule_id uuid,
    p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    item jsonb;
    item_slot public.schedule_slots%rowtype;
    item_index integer = 0;
    item_status text;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    select *
    into target_schedule
    from public.schedules
    where id = p_schedule_id
      and owner_id = auth.uid();

    if target_schedule.id is null then
        raise exception 'owner access denied' using errcode = '28000';
    end if;

    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) < 1 then
        raise exception 'confirmation items required' using errcode = '22023';
    end if;

    delete from public.schedule_confirmed_slots
    where schedule_id = p_schedule_id;

    for item in
        select value from jsonb_array_elements(p_items)
    loop
        item_status = coalesce(nullif(item ->> 'status', ''), 'confirmed');

        if item_status not in ('held', 'confirmed') then
            raise exception 'invalid confirmed slot status' using errcode = '22023';
        end if;

        select *
        into item_slot
        from public.schedule_slots
        where id = (item ->> 'slotId')::uuid
          and schedule_id = p_schedule_id;

        if item_slot.id is null then
            raise exception 'slot not found' using errcode = 'P0002';
        end if;

        insert into public.schedule_confirmed_slots (
            schedule_id,
            slot_id,
            sequence,
            status,
            local_date,
            start_minute,
            end_minute,
            starts_at,
            ends_at,
            created_by
        )
        values (
            p_schedule_id,
            item_slot.id,
            item_index,
            item_status,
            item_slot.local_date,
            item_slot.start_minute,
            item_slot.end_minute,
            item_slot.starts_at,
            item_slot.ends_at,
            auth.uid()
        );

        item_index = item_index + 1;
    end loop;

    update public.schedules
    set status = case
        when exists (
            select 1
            from public.schedule_confirmed_slots confirmed
            where confirmed.schedule_id = p_schedule_id
              and confirmed.status = 'held'
        ) then 'held'
        else 'confirmed'
    end
    where id = p_schedule_id;

    return jsonb_build_object('scheduleId', p_schedule_id, 'confirmedCount', item_index);
end;
$$;

alter table public.schedules enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.schedule_participants enable row level security;
alter table public.schedule_guest_credentials enable row level security;
alter table public.schedule_responses enable row level security;
alter table public.schedule_response_ranges enable row level security;
alter table public.schedule_confirmed_slots enable row level security;

create policy schedules_owner_all on public.schedules
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy schedules_auth_participant_select on public.schedules
for select to authenticated
using (
    exists (
        select 1
        from public.schedule_participants participant
        where participant.schedule_id = schedules.id
          and participant.user_id = auth.uid()
    )
);

create policy schedule_slots_owner_all on public.schedule_slots
for all to authenticated
using (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_slots.schedule_id
          and schedule.owner_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_slots.schedule_id
          and schedule.owner_id = auth.uid()
    )
);

create policy schedule_slots_auth_participant_select on public.schedule_slots
for select to authenticated
using (
    exists (
        select 1 from public.schedule_participants participant
        where participant.schedule_id = schedule_slots.schedule_id
          and participant.user_id = auth.uid()
    )
);

create policy schedule_participants_owner_all on public.schedule_participants
for all to authenticated
using (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_participants.schedule_id
          and schedule.owner_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_participants.schedule_id
          and schedule.owner_id = auth.uid()
    )
);

create policy schedule_participants_auth_participant_select on public.schedule_participants
for select to authenticated
using (
    exists (
        select 1 from public.schedule_participants self
        where self.schedule_id = schedule_participants.schedule_id
          and self.user_id = auth.uid()
    )
);

create policy schedule_responses_owner_select_delete on public.schedule_responses
for select to authenticated
using (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_responses.schedule_id
          and schedule.owner_id = auth.uid()
    )
);

create policy schedule_responses_owner_delete on public.schedule_responses
for delete to authenticated
using (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_responses.schedule_id
          and schedule.owner_id = auth.uid()
    )
);

create policy schedule_responses_auth_participant_select on public.schedule_responses
for select to authenticated
using (
    exists (
        select 1 from public.schedule_participants participant
        where participant.id = schedule_responses.participant_id
          and participant.user_id = auth.uid()
    )
);

create policy schedule_responses_auth_participant_insert on public.schedule_responses
for insert to authenticated
with check (
    exists (
        select 1 from public.schedule_participants participant
        where participant.id = schedule_responses.participant_id
          and participant.schedule_id = schedule_responses.schedule_id
          and participant.user_id = auth.uid()
    )
);

create policy schedule_responses_auth_participant_update on public.schedule_responses
for update to authenticated
using (
    exists (
        select 1 from public.schedule_participants participant
        where participant.id = schedule_responses.participant_id
          and participant.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.schedule_participants participant
        where participant.id = schedule_responses.participant_id
          and participant.schedule_id = schedule_responses.schedule_id
          and participant.user_id = auth.uid()
    )
);

create policy schedule_response_ranges_owner_select on public.schedule_response_ranges
for select to authenticated
using (
    exists (
        select 1
        from public.schedule_responses response
        join public.schedules schedule on schedule.id = response.schedule_id
        where response.id = schedule_response_ranges.response_id
          and schedule.owner_id = auth.uid()
    )
);

create policy schedule_response_ranges_auth_participant_all on public.schedule_response_ranges
for all to authenticated
using (
    exists (
        select 1
        from public.schedule_responses response
        join public.schedule_participants participant on participant.id = response.participant_id
        where response.id = schedule_response_ranges.response_id
          and participant.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.schedule_responses response
        join public.schedule_participants participant on participant.id = response.participant_id
        where response.id = schedule_response_ranges.response_id
          and participant.user_id = auth.uid()
    )
);

create policy schedule_confirmed_slots_owner_all on public.schedule_confirmed_slots
for all to authenticated
using (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_confirmed_slots.schedule_id
          and schedule.owner_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.schedules schedule
        where schedule.id = schedule_confirmed_slots.schedule_id
          and schedule.owner_id = auth.uid()
    )
);

create policy schedule_confirmed_slots_auth_participant_select on public.schedule_confirmed_slots
for select to authenticated
using (
    exists (
        select 1 from public.schedule_participants participant
        where participant.schedule_id = schedule_confirmed_slots.schedule_id
          and participant.user_id = auth.uid()
    )
);

revoke all on table public.schedules from anon, authenticated;
revoke all on table public.schedule_slots from anon, authenticated;
revoke all on table public.schedule_participants from anon, authenticated;
revoke all on table public.schedule_guest_credentials from anon, authenticated;
revoke all on table public.schedule_responses from anon, authenticated;
revoke all on table public.schedule_response_ranges from anon, authenticated;
revoke all on table public.schedule_confirmed_slots from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.schedules to authenticated;
grant select, insert, update, delete on table public.schedule_slots to authenticated;
grant select, insert, update, delete on table public.schedule_participants to authenticated;
grant select, insert, update, delete on table public.schedule_responses to authenticated;
grant select, insert, update, delete on table public.schedule_response_ranges to authenticated;
grant select, insert, update, delete on table public.schedule_confirmed_slots to authenticated;

revoke all on function public.schedule_generate_token(integer) from public, anon, authenticated;
revoke all on function public.schedule_hash_token(text) from public, anon, authenticated;
revoke all on function public.schedule_set_timestamps() from public, anon, authenticated;
revoke all on function public.schedule_set_root_timestamps() from public, anon, authenticated;
revoke all on function public.schedule_touch(uuid) from public, anon, authenticated;
revoke all on function public.schedule_touch_from_child() from public, anon, authenticated;
revoke all on function public.schedule_touch_from_range() from public, anon, authenticated;
revoke all on function public.schedule_assert_guest(text, uuid, text) from public, anon, authenticated;
revoke all on function public.schedule_public_view(text) from public, anon, authenticated;
revoke all on function public.schedule_guest_join(text, text) from public, anon, authenticated;
revoke all on function public.schedule_guest_view(text, uuid, text) from public, anon, authenticated;
revoke all on function public.schedule_guest_update_name(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.schedule_guest_upsert_response(text, uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.schedule_owner_confirm_slots(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.schedule_public_view(text) to anon, authenticated;
grant execute on function public.schedule_guest_join(text, text) to anon, authenticated;
grant execute on function public.schedule_guest_view(text, uuid, text) to anon, authenticated;
grant execute on function public.schedule_guest_update_name(text, uuid, text, text) to anon, authenticated;
grant execute on function public.schedule_guest_upsert_response(text, uuid, text, uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.schedule_owner_confirm_slots(uuid, jsonb) to authenticated;
