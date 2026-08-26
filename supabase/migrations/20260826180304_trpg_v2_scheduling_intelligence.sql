-- RELMUA TRPG v2 Scheduler V3.2 scheduling intelligence.
-- Additive only: Recommendation calculation remains client-side over shared
-- response data. This RPC revalidates the selected continuous interval
-- transactionally before it becomes a confirmed session slot.

create or replace function public.trpg_v32_confirm_recommendation(
    p_schedule_id uuid,
    p_slot_id uuid,
    p_start_minute integer,
    p_end_minute integer,
    p_snapshot_at timestamptz
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
    required_participant public.schedule_participants%rowtype;
    participant_response public.schedule_responses%rowtype;
    local_start timestamp;
    confirmed_start timestamptz;
    confirmed_end timestamptz;
    latest_change timestamptz;
    created_confirmed public.schedule_confirmed_slots%rowtype;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    select *
    into target_schedule
    from public.schedules schedule
    where schedule.id = p_schedule_id
      and schedule.owner_id = auth.uid()
    for update;

    if target_schedule.id is null then
        raise exception 'owner access denied' using errcode = '28000';
    end if;

    select *
    into target_slot
    from public.schedule_slots slot
    where slot.id = p_slot_id
      and slot.schedule_id = p_schedule_id
    for update;

    if target_slot.id is null then
        raise exception 'candidate not found' using errcode = 'P0002';
    end if;

    if p_start_minute is null
        or p_end_minute is null
        or p_start_minute < target_slot.start_minute
        or p_end_minute > target_slot.end_minute
        or p_end_minute <= p_start_minute then
        raise exception 'confirmed time must stay within the candidate' using errcode = '22023';
    end if;

    select max(change_at)
    into latest_change
    from (
        select target_slot.updated_at as change_at
        union all
        select participant.updated_at
        from public.schedule_participants participant
        where participant.schedule_id = p_schedule_id
          and participant.role <> 'viewer'
        union all
        select response.updated_at
        from public.schedule_responses response
        join public.schedule_participants participant
          on participant.id = response.participant_id
        where response.schedule_id = p_schedule_id
          and participant.role <> 'viewer'
        union all
        select range_item.updated_at
        from public.schedule_response_ranges range_item
        join public.schedule_responses response
          on response.id = range_item.response_id
        join public.schedule_participants participant
          on participant.id = response.participant_id
        where response.schedule_id = p_schedule_id
          and participant.role <> 'viewer'
    ) changes;

    if p_snapshot_at is null
        or (latest_change is not null and date_trunc('milliseconds', latest_change) > date_trunc('milliseconds', p_snapshot_at)) then
        raise exception 'recommendation is stale; review the latest responses' using errcode = '40001';
    end if;

    local_start = target_slot.local_date::timestamp;
    confirmed_start = (local_start + make_interval(mins => p_start_minute)) at time zone target_schedule.timezone;
    confirmed_end = (local_start + make_interval(mins => p_end_minute)) at time zone target_schedule.timezone;

    for required_participant in
        select *
        from public.schedule_participants participant
        where participant.schedule_id = p_schedule_id
          and participant.role <> 'viewer'
        order by participant.sort_order
        for update
    loop
        select *
        into participant_response
        from public.schedule_responses response
        where response.schedule_id = p_schedule_id
          and response.participant_id = required_participant.id
          and response.slot_id = p_slot_id
        for update;

        if participant_response.id is null then
            raise exception 'recommendation has unanswered required participants' using errcode = '40001';
        end if;

        if participant_response.answer = 'no' then
            raise exception 'recommendation has unavailable required participants' using errcode = '40001';
        end if;

        if participant_response.answer = 'maybe'
            and not exists (
                select 1
                from public.schedule_response_ranges range_item
                where range_item.response_id = participant_response.id
                  and range_item.start_minute <= p_start_minute
                  and range_item.end_minute >= p_end_minute
            ) then
            raise exception 'recommendation has uncertain required participants' using errcode = '40001';
        end if;

        if required_participant.user_id is not null
            and exists (
                select 1
                from public.schedule_confirmed_slots confirmed
                join public.schedule_participants other_participant
                  on other_participant.schedule_id = confirmed.schedule_id
                 and other_participant.user_id = required_participant.user_id
                where confirmed.schedule_id <> p_schedule_id
                  and confirmed.status in ('held', 'confirmed')
                  and confirmed.ends_at > confirmed_start
                  and confirmed.starts_at < confirmed_end
            ) then
            raise exception 'recommendation conflicts with another confirmed session' using errcode = '40001';
        end if;
    end loop;

    delete from public.schedule_confirmed_slots
    where schedule_id = p_schedule_id;

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
        target_slot.id,
        0,
        'confirmed',
        target_slot.local_date,
        p_start_minute,
        p_end_minute,
        confirmed_start,
        confirmed_end,
        auth.uid()
    )
    returning * into created_confirmed;

    update public.schedules
    set status = 'confirmed'
    where id = p_schedule_id;

    return jsonb_build_object(
        'scheduleId', p_schedule_id,
        'slotId', target_slot.id,
        'confirmedSlotId', created_confirmed.id,
        'startMinute', p_start_minute,
        'endMinute', p_end_minute
    );
end;
$$;

revoke all on function public.trpg_v32_confirm_recommendation(uuid, uuid, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.trpg_v32_confirm_recommendation(uuid, uuid, integer, integer, timestamptz) to authenticated;
