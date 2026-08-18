-- RELMUA Schedule DB v1 account participant support.
-- Adds a minimal profile table and authenticated participant RPCs while
-- preserving guest token/RPC access and the existing stable slot model.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_display_name_length check (char_length(display_name) between 1 and 80)
);

drop trigger if exists profiles_set_timestamps on public.profiles;
create trigger profiles_set_timestamps
before insert or update on public.profiles
for each row execute function public.schedule_set_timestamps();

alter table public.profiles enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;

create policy profiles_owner_select on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_owner_insert on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_owner_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.schedule_public_view(p_share_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    slot_payload jsonb;
    participant_payload jsonb;
    summary_payload jsonb;
    confirmed_payload jsonb;
begin
    select *
    into target_schedule
    from public.schedules schedule
    where schedule.share_id = p_share_id
      and schedule.share_enabled = true
      and schedule.expires_at > now();

    if target_schedule.id is null then
        return null;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'id', slot.id,
        'localDate', slot.local_date,
        'startMinute', slot.start_minute,
        'endMinute', slot.end_minute,
        'startsAt', slot.starts_at,
        'endsAt', slot.ends_at,
        'sortOrder', slot.sort_order,
        'label', slot.label
    ) order by slot.sort_order), '[]'::jsonb)
    into slot_payload
    from public.schedule_slots slot
    where slot.schedule_id = target_schedule.id;

    select coalesce(jsonb_agg(jsonb_build_object(
        'id', participant.id,
        'displayName', participant.display_name,
        'role', participant.role,
        'required', participant.required,
        'answered', exists (
            select 1
            from public.schedule_responses response
            where response.participant_id = participant.id
        )
    ) order by participant.sort_order), '[]'::jsonb)
    into participant_payload
    from public.schedule_participants participant
    where participant.schedule_id = target_schedule.id;

    select coalesce(jsonb_agg(jsonb_build_object(
        'slotId', slot.id,
        'yes', coalesce(counts.yes_count, 0),
        'maybe', coalesce(counts.maybe_count, 0),
        'no', coalesce(counts.no_count, 0),
        'answered', coalesce(counts.answered_count, 0)
    ) order by slot.sort_order), '[]'::jsonb)
    into summary_payload
    from public.schedule_slots slot
    left join lateral (
        select
            count(*) filter (where response.answer = 'yes') as yes_count,
            count(*) filter (where response.answer = 'maybe') as maybe_count,
            count(*) filter (where response.answer = 'no') as no_count,
            count(*) as answered_count
        from public.schedule_responses response
        where response.slot_id = slot.id
    ) counts on true
    where slot.schedule_id = target_schedule.id;

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
    ) order by confirmed.sequence), '[]'::jsonb)
    into confirmed_payload
    from public.schedule_confirmed_slots confirmed
    where confirmed.schedule_id = target_schedule.id;

    return jsonb_build_object(
        'schedule', jsonb_build_object(
            'id', target_schedule.id,
            'shareId', target_schedule.share_id,
            'title', target_schedule.title,
            'description', target_schedule.description,
            'timezone', target_schedule.timezone,
            'status', target_schedule.status,
            'totalMinutes', target_schedule.total_minutes,
            'sessionMinutes', target_schedule.session_minutes,
            'updatedAt', target_schedule.updated_at,
            'lastActivityAt', target_schedule.last_activity_at,
            'expiresAt', target_schedule.expires_at
        ),
        'slots', slot_payload,
        'participants', participant_payload,
        'summaries', summary_payload,
        'confirmedSlots', confirmed_payload,
        'responses', '[]'::jsonb
    );
end;
$$;

create or replace function public.schedule_account_view(p_share_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    public_payload jsonb;
    own_participant public.schedule_participants%rowtype;
    own_responses jsonb;
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
        return null;
    end if;

    public_payload = public.schedule_public_view(p_share_id);

    select *
    into own_participant
    from public.schedule_participants participant
    where participant.schedule_id = target_schedule.id
      and participant.user_id = auth.uid();

    if own_participant.id is null then
        return public_payload;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'slotId', response.slot_id,
        'participantId', response.participant_id,
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
    ) order by response.updated_at), '[]'::jsonb)
    into own_responses
    from public.schedule_responses response
    where response.schedule_id = target_schedule.id
      and response.participant_id = own_participant.id;

    return public_payload || jsonb_build_object(
        'schedule', (public_payload -> 'schedule') ||
            case when target_schedule.owner_id = auth.uid()
                then jsonb_build_object('ownerId', target_schedule.owner_id)
                else '{}'::jsonb
            end,
        'me', jsonb_build_object(
            'participantId', own_participant.id,
            'userId', auth.uid(),
            'displayName', own_participant.display_name,
            'role', own_participant.role,
            'required', own_participant.required
        ),
        'responses', own_responses
    );
end;
$$;

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

    p_display_name = trim(coalesce(p_display_name, ''));

    if char_length(p_display_name) < 1 or char_length(p_display_name) > 80 then
        raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
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

    insert into public.profiles (id, display_name)
    values (auth.uid(), p_display_name)
    on conflict (id)
    do update set display_name = excluded.display_name
    returning display_name into profile_name;

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
    else
        update public.schedule_participants
        set display_name = profile_name
        where id = existing_participant.id;
    end if;

    return public.schedule_account_view(p_share_id);
end;
$$;

create or replace function public.schedule_account_upsert_response(
    p_share_id text,
    p_slot_id uuid,
    p_answer text,
    p_note text default '',
    p_ranges jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    target_slot public.schedule_slots%rowtype;
    target_participant public.schedule_participants%rowtype;
    response_uuid uuid;
    range_item jsonb;
    range_start integer;
    range_end integer;
    range_answer text;
    range_index integer = 0;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

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

    select *
    into target_schedule
    from public.schedules schedule
    where schedule.share_id = p_share_id
      and schedule.share_enabled = true
      and schedule.expires_at > now();

    if target_schedule.id is null then
        raise exception 'schedule is not available' using errcode = '28000';
    end if;

    select *
    into target_participant
    from public.schedule_participants participant
    where participant.schedule_id = target_schedule.id
      and participant.user_id = auth.uid();

    if target_participant.id is null then
        raise exception 'participant access denied' using errcode = '28000';
    end if;

    select *
    into target_slot
    from public.schedule_slots slot
    where slot.id = p_slot_id
      and slot.schedule_id = target_schedule.id;

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
        target_schedule.id,
        target_participant.id,
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

    return public.schedule_account_view(p_share_id);
end;
$$;

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

revoke all on function public.schedule_account_view(text) from public, anon, authenticated;
revoke all on function public.schedule_account_join(text, text) from public, anon, authenticated;
revoke all on function public.schedule_account_upsert_response(text, uuid, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.schedule_account_view(text) to authenticated;
grant execute on function public.schedule_account_join(text, text) to authenticated;
grant execute on function public.schedule_account_upsert_response(text, uuid, text, text, jsonb) to authenticated;
