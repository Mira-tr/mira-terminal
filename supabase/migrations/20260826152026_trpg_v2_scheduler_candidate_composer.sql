-- RELMUA TRPG v2 Scheduler candidate composer.
-- Keeps Schedule DB v1 tables and permissions intact while adding:
-- - Discord-facing global profile synchronization
-- - presentation-only per-session participant names
-- - atomic multi-candidate creation for calendar multi-select

create or replace function public.trpg_v2_auth_profile()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
    select coalesce(jsonb_build_object(
        'displayName', coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'global_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'username', ''),
            nullif(auth_user.raw_user_meta_data ->> 'user_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'preferred_username', ''),
            nullif(auth_user.raw_user_meta_data ->> 'name', ''),
            'RELMUA User'
        ),
        'avatarUrl', coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
            nullif(auth_user.raw_user_meta_data ->> 'picture', '')
        ),
        'discordUserId', coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'provider_id', ''),
            nullif(auth_user.raw_user_meta_data ->> 'sub', '')
        )
    ), '{}'::jsonb)
    from auth.users auth_user
    where auth_user.id = auth.uid();
$$;

-- Repair only legacy values that exactly equal the provider's technical ID.
-- Deliberately do not overwrite any existing human-selected session name.
with discord_identity as (
    select
        auth_user.id,
        left(coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'global_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'username', ''),
            nullif(auth_user.raw_user_meta_data ->> 'user_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'preferred_username', ''),
            nullif(auth_user.raw_user_meta_data ->> 'name', ''),
            'RELMUA User'
        ), 80) as display_name,
        coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'provider_id', ''),
            nullif(auth_user.raw_user_meta_data ->> 'sub', '')
        ) as technical_id
    from auth.users auth_user
    where auth_user.raw_app_meta_data ->> 'provider' = 'discord'
)
update public.profiles profile
set display_name = discord_identity.display_name
from discord_identity
where profile.id = discord_identity.id
  and discord_identity.technical_id is not null
  and profile.display_name = discord_identity.technical_id;

with discord_identity as (
    select
        auth_user.id,
        left(coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'global_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'username', ''),
            nullif(auth_user.raw_user_meta_data ->> 'user_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'preferred_username', ''),
            nullif(auth_user.raw_user_meta_data ->> 'name', ''),
            'RELMUA User'
        ), 80) as display_name,
        coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'provider_id', ''),
            nullif(auth_user.raw_user_meta_data ->> 'sub', '')
        ) as technical_id
    from auth.users auth_user
    where auth_user.raw_app_meta_data ->> 'provider' = 'discord'
)
update public.schedule_participants participant
set display_name = discord_identity.display_name
from discord_identity
where participant.user_id = discord_identity.id
  and discord_identity.technical_id is not null
  and participant.display_name = discord_identity.technical_id;

create or replace function public.schedule_account_join(
    p_share_id text,
    p_display_name text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    existing_participant public.schedule_participants%rowtype;
    participant_count integer;
    profile_name text;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    select *
    into target_schedule
    from public.schedules schedule
    where schedule.share_id = p_share_id
      and schedule.share_enabled = true
      and schedule.expires_at > now();

    if target_schedule.id is null then
        raise exception 'schedule is not available' using errcode = '28000';
    end if;

    select profile.display_name
    into profile_name
    from public.profiles profile
    where profile.id = auth.uid();

    if profile_name is null then
        profile_name = left(trim(coalesce(p_display_name, '')), 80);

        if char_length(profile_name) < 1 then
            raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
        end if;

        insert into public.profiles (id, display_name)
        values (auth.uid(), profile_name)
        on conflict (id) do nothing;

        select profile.display_name
        into profile_name
        from public.profiles profile
        where profile.id = auth.uid();
    end if;

    select *
    into existing_participant
    from public.schedule_participants participant
    where participant.schedule_id = target_schedule.id
      and participant.user_id = auth.uid();

    if existing_participant.id is null then
        select count(*)
        into participant_count
        from public.schedule_participants participant
        where participant.schedule_id = target_schedule.id;

        if participant_count >= target_schedule.max_participants then
            raise exception 'participant limit reached' using errcode = '54000';
        end if;

        insert into public.schedule_participants (
            schedule_id,
            user_id,
            display_name,
            role,
            required,
            sort_order
        )
        values (
            target_schedule.id,
            auth.uid(),
            profile_name,
            case when target_schedule.owner_id = auth.uid() then 'owner' else 'participant' end,
            target_schedule.owner_id = auth.uid(),
            participant_count
        );
    end if;

    return public.schedule_account_view(p_share_id);
end;
$$;

create or replace function public.trpg_v2_update_session_display_name(
    p_schedule_id uuid,
    p_display_name text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    saved_participant public.schedule_participants%rowtype;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    p_display_name = left(trim(coalesce(p_display_name, '')), 80);

    if char_length(p_display_name) < 1 then
        raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
    end if;

    update public.schedule_participants participant
    set display_name = p_display_name
    where participant.schedule_id = p_schedule_id
      and participant.user_id = auth.uid()
    returning * into saved_participant;

    if saved_participant.id is null then
        raise exception 'participant access denied' using errcode = '28000';
    end if;

    return jsonb_build_object(
        'scheduleId', p_schedule_id,
        'participantId', saved_participant.id,
        'displayName', saved_participant.display_name
    );
end;
$$;

create or replace function public.trpg_v2_add_candidates(
    p_schedule_id uuid,
    p_candidates jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    candidate_item jsonb;
    candidate_starts_at timestamptz;
    candidate_ends_at timestamptz;
    local_start timestamp;
    local_end timestamp;
    start_of_day timestamp;
    start_minute integer;
    end_minute integer;
    next_order integer;
    candidate_count integer = 0;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    if jsonb_typeof(coalesce(p_candidates, '[]'::jsonb)) <> 'array'
        or jsonb_array_length(coalesce(p_candidates, '[]'::jsonb)) < 1 then
        raise exception 'at least one candidate is required' using errcode = '22023';
    end if;

    if jsonb_array_length(p_candidates) > 120 then
        raise exception 'too many candidates' using errcode = '22023';
    end if;

    select *
    into target_schedule
    from public.schedules schedule
    where schedule.id = p_schedule_id
      and schedule.owner_id = auth.uid();

    if target_schedule.id is null then
        raise exception 'owner access denied' using errcode = '28000';
    end if;

    select coalesce(max(slot.sort_order), -1) + 1
    into next_order
    from public.schedule_slots slot
    where slot.schedule_id = p_schedule_id;

    for candidate_item in
        select value from jsonb_array_elements(p_candidates)
    loop
        begin
            candidate_starts_at = nullif(candidate_item ->> 'startsAt', '')::timestamptz;
            candidate_ends_at = nullif(candidate_item ->> 'endsAt', '')::timestamptz;
        exception when others then
            raise exception 'invalid candidate time' using errcode = '22023';
        end;

        if candidate_starts_at is null
            or candidate_ends_at is null
            or candidate_ends_at <= candidate_starts_at then
            raise exception 'invalid candidate time' using errcode = '22023';
        end if;

        local_start = candidate_starts_at at time zone target_schedule.timezone;
        local_end = candidate_ends_at at time zone target_schedule.timezone;
        start_of_day = date_trunc('day', local_start);
        start_minute = floor(extract(epoch from (local_start - start_of_day)) / 60)::integer;
        end_minute = floor(extract(epoch from (local_end - start_of_day)) / 60)::integer;

        if local_end <= local_start
            or end_minute <= start_minute
            or end_minute > 1800 then
            raise exception 'candidate duration must be between one minute and 30 hours' using errcode = '22023';
        end if;

        insert into public.schedule_slots (
            schedule_id,
            local_date,
            start_minute,
            end_minute,
            starts_at,
            ends_at,
            sort_order,
            label
        )
        values (
            p_schedule_id,
            local_start::date,
            start_minute,
            end_minute,
            candidate_starts_at,
            candidate_ends_at,
            next_order,
            left(trim(coalesce(candidate_item ->> 'label', '')), 120)
        );

        next_order = next_order + 1;
        candidate_count = candidate_count + 1;
    end loop;

    update public.schedules
    set status = 'collecting'
    where id = p_schedule_id
      and status in ('draft', 'ready');

    return jsonb_build_object(
        'scheduleId', p_schedule_id,
        'candidateCount', candidate_count
    );
end;
$$;

create or replace function public.trpg_v2_add_candidate(
    p_schedule_id uuid,
    p_starts_at timestamptz,
    p_ends_at timestamptz,
    p_label text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
    return public.trpg_v2_add_candidates(
        p_schedule_id,
        jsonb_build_array(jsonb_build_object(
            'startsAt', p_starts_at,
            'endsAt', p_ends_at,
            'label', p_label
        ))
    );
end;
$$;

revoke all on function public.trpg_v2_update_session_display_name(uuid, text) from public, anon, authenticated;
revoke all on function public.trpg_v2_add_candidates(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;

grant execute on function public.trpg_v2_update_session_display_name(uuid, text) to authenticated;
grant execute on function public.trpg_v2_add_candidates(uuid, jsonb) to authenticated;
grant execute on function public.trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text) to authenticated;

-- Scheduler V3.1 keeps personal availability separate from session identity.
-- A missing weekday is intentionally "unset", distinct from an explicit unavailable day.
create table public.trpg_personal_availability_weekly_days (
    user_id uuid not null references auth.users(id) on delete cascade,
    weekday smallint not null,
    state text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, weekday),
    constraint trpg_personal_availability_weekly_days_weekday_check check (weekday between 0 and 6),
    constraint trpg_personal_availability_weekly_days_state_check check (state in ('available', 'unavailable'))
);

create table public.trpg_personal_availability_weekly_ranges (
    id uuid primary key default extensions.gen_random_uuid(),
    user_id uuid not null,
    weekday smallint not null,
    start_minute integer not null,
    end_minute integer not null,
    sort_order smallint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint trpg_personal_availability_weekly_ranges_time_check check (
        start_minute >= 0
        and end_minute > start_minute
        and end_minute <= 1800
    ),
    constraint trpg_personal_availability_weekly_ranges_sort_check check (sort_order between 0 and 3),
    unique (user_id, weekday, sort_order),
    foreign key (user_id, weekday)
        references public.trpg_personal_availability_weekly_days(user_id, weekday)
        on delete cascade
);

create table public.trpg_personal_availability_date_exceptions (
    id uuid primary key default extensions.gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    local_date date not null,
    state text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint trpg_personal_availability_date_exceptions_state_check check (state in ('available', 'unavailable')),
    unique (user_id, local_date)
);

create table public.trpg_personal_availability_date_ranges (
    id uuid primary key default extensions.gen_random_uuid(),
    exception_id uuid not null references public.trpg_personal_availability_date_exceptions(id) on delete cascade,
    start_minute integer not null,
    end_minute integer not null,
    sort_order smallint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint trpg_personal_availability_date_ranges_time_check check (
        start_minute >= 0
        and end_minute > start_minute
        and end_minute <= 1800
    ),
    constraint trpg_personal_availability_date_ranges_sort_check check (sort_order between 0 and 3),
    unique (exception_id, sort_order)
);

create index trpg_personal_availability_date_exceptions_user_date_idx
on public.trpg_personal_availability_date_exceptions(user_id, local_date);

alter table public.trpg_personal_availability_weekly_days enable row level security;
alter table public.trpg_personal_availability_weekly_ranges enable row level security;
alter table public.trpg_personal_availability_date_exceptions enable row level security;
alter table public.trpg_personal_availability_date_ranges enable row level security;

create or replace function public.trpg_v31_get_personal_availability()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    weekly_payload jsonb;
    exception_payload jsonb;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'weekday', weekday_item.weekday,
        'state', weekday_item.state,
        'ranges', coalesce((
            select jsonb_agg(jsonb_build_object(
                'startMinute', range_item.start_minute,
                'endMinute', range_item.end_minute,
                'sortOrder', range_item.sort_order
            ) order by range_item.sort_order)
            from public.trpg_personal_availability_weekly_ranges range_item
            where range_item.user_id = weekday_item.user_id
              and range_item.weekday = weekday_item.weekday
        ), '[]'::jsonb)
    ) order by weekday_item.weekday), '[]'::jsonb)
    into weekly_payload
    from public.trpg_personal_availability_weekly_days weekday_item
    where weekday_item.user_id = auth.uid();

    select coalesce(jsonb_agg(jsonb_build_object(
        'localDate', exception_item.local_date,
        'state', exception_item.state,
        'ranges', coalesce((
            select jsonb_agg(jsonb_build_object(
                'startMinute', range_item.start_minute,
                'endMinute', range_item.end_minute,
                'sortOrder', range_item.sort_order
            ) order by range_item.sort_order)
            from public.trpg_personal_availability_date_ranges range_item
            where range_item.exception_id = exception_item.id
        ), '[]'::jsonb)
    ) order by exception_item.local_date), '[]'::jsonb)
    into exception_payload
    from public.trpg_personal_availability_date_exceptions exception_item
    where exception_item.user_id = auth.uid();

    return jsonb_build_object(
        'weekly', weekly_payload,
        'exceptions', exception_payload
    );
end;
$$;

create or replace function public.trpg_v31_save_personal_availability(
    p_weekly jsonb default '[]'::jsonb,
    p_exceptions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    week_item jsonb;
    exception_item jsonb;
    range_item jsonb;
    weekday_value integer;
    state_value text;
    date_value date;
    date_text text;
    exception_id uuid;
    start_value integer;
    end_value integer;
    range_index integer;
    seen_weekdays boolean[] := array[false, false, false, false, false, false, false];
    seen_dates text[] := array[]::text[];
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    if jsonb_typeof(coalesce(p_weekly, '[]'::jsonb)) <> 'array'
        or jsonb_typeof(coalesce(p_exceptions, '[]'::jsonb)) <> 'array' then
        raise exception 'availability must be arrays' using errcode = '22023';
    end if;

    if jsonb_array_length(coalesce(p_weekly, '[]'::jsonb)) > 7
        or jsonb_array_length(coalesce(p_exceptions, '[]'::jsonb)) > 365 then
        raise exception 'too many availability entries' using errcode = '22023';
    end if;

    -- This only replaces the caller's saved preference rows. It never touches schedules.
    delete from public.trpg_personal_availability_date_exceptions
    where user_id = auth.uid();

    delete from public.trpg_personal_availability_weekly_days
    where user_id = auth.uid();

    for week_item in
        select value from jsonb_array_elements(coalesce(p_weekly, '[]'::jsonb))
    loop
        weekday_value = nullif(week_item ->> 'weekday', '')::integer;
        state_value = lower(trim(coalesce(week_item ->> 'state', '')));

        if weekday_value is null or weekday_value < 0 or weekday_value > 6
            or state_value not in ('available', 'unavailable') then
            raise exception 'invalid weekly availability' using errcode = '22023';
        end if;

        if seen_weekdays[weekday_value + 1] then
            raise exception 'duplicate weekly availability' using errcode = '22023';
        end if;
        seen_weekdays[weekday_value + 1] = true;

        if jsonb_typeof(coalesce(week_item -> 'ranges', '[]'::jsonb)) <> 'array'
            or jsonb_array_length(coalesce(week_item -> 'ranges', '[]'::jsonb)) > 4
            or (state_value = 'available' and jsonb_array_length(coalesce(week_item -> 'ranges', '[]'::jsonb)) = 0)
            or (state_value = 'unavailable' and jsonb_array_length(coalesce(week_item -> 'ranges', '[]'::jsonb)) <> 0) then
            raise exception 'invalid weekly ranges' using errcode = '22023';
        end if;

        insert into public.trpg_personal_availability_weekly_days (user_id, weekday, state)
        values (auth.uid(), weekday_value, state_value);

        range_index = 0;
        for range_item in
            select value from jsonb_array_elements(coalesce(week_item -> 'ranges', '[]'::jsonb))
        loop
            start_value = nullif(range_item ->> 'startMinute', '')::integer;
            end_value = nullif(range_item ->> 'endMinute', '')::integer;

            if start_value is null or end_value is null or start_value < 0 or end_value <= start_value or end_value > 1800
                or exists (
                    select 1
                    from public.trpg_personal_availability_weekly_ranges existing
                    where existing.user_id = auth.uid()
                      and existing.weekday = weekday_value
                      and not (existing.end_minute <= start_value or existing.start_minute >= end_value)
                ) then
                raise exception 'invalid or overlapping weekly range' using errcode = '22023';
            end if;

            insert into public.trpg_personal_availability_weekly_ranges (
                user_id, weekday, start_minute, end_minute, sort_order
            ) values (
                auth.uid(), weekday_value, start_value, end_value, range_index
            );
            range_index = range_index + 1;
        end loop;
    end loop;

    for exception_item in
        select value from jsonb_array_elements(coalesce(p_exceptions, '[]'::jsonb))
    loop
        date_text = trim(coalesce(exception_item ->> 'localDate', ''));
        state_value = lower(trim(coalesce(exception_item ->> 'state', '')));

        if date_text !~ '^\d{4}-\d{2}-\d{2}$' or state_value not in ('available', 'unavailable') then
            raise exception 'invalid date availability' using errcode = '22023';
        end if;
        date_value = date_text::date;

        if date_text = any(seen_dates) then
            raise exception 'duplicate date availability' using errcode = '22023';
        end if;
        seen_dates = array_append(seen_dates, date_text);

        if jsonb_typeof(coalesce(exception_item -> 'ranges', '[]'::jsonb)) <> 'array'
            or jsonb_array_length(coalesce(exception_item -> 'ranges', '[]'::jsonb)) > 4
            or (state_value = 'available' and jsonb_array_length(coalesce(exception_item -> 'ranges', '[]'::jsonb)) = 0)
            or (state_value = 'unavailable' and jsonb_array_length(coalesce(exception_item -> 'ranges', '[]'::jsonb)) <> 0) then
            raise exception 'invalid date ranges' using errcode = '22023';
        end if;

        insert into public.trpg_personal_availability_date_exceptions (user_id, local_date, state)
        values (auth.uid(), date_value, state_value)
        returning id into exception_id;

        range_index = 0;
        for range_item in
            select value from jsonb_array_elements(coalesce(exception_item -> 'ranges', '[]'::jsonb))
        loop
            start_value = nullif(range_item ->> 'startMinute', '')::integer;
            end_value = nullif(range_item ->> 'endMinute', '')::integer;

            if start_value is null or end_value is null or start_value < 0 or end_value <= start_value or end_value > 1800
                or exists (
                    select 1
                    from public.trpg_personal_availability_date_ranges existing
                    where existing.exception_id = exception_id
                      and not (existing.end_minute <= start_value or existing.start_minute >= end_value)
                ) then
                raise exception 'invalid or overlapping date range' using errcode = '22023';
            end if;

            insert into public.trpg_personal_availability_date_ranges (
                exception_id, start_minute, end_minute, sort_order
            ) values (
                exception_id, start_value, end_value, range_index
            );
            range_index = range_index + 1;
        end loop;
    end loop;

    return public.trpg_v31_get_personal_availability();
end;
$$;

revoke all on table public.trpg_personal_availability_weekly_days from public, anon, authenticated;
revoke all on table public.trpg_personal_availability_weekly_ranges from public, anon, authenticated;
revoke all on table public.trpg_personal_availability_date_exceptions from public, anon, authenticated;
revoke all on table public.trpg_personal_availability_date_ranges from public, anon, authenticated;
revoke all on function public.trpg_v31_get_personal_availability() from public, anon, authenticated;
revoke all on function public.trpg_v31_save_personal_availability(jsonb, jsonb) from public, anon, authenticated;

grant execute on function public.trpg_v31_get_personal_availability() to authenticated;
grant execute on function public.trpg_v31_save_personal_availability(jsonb, jsonb) to authenticated;
