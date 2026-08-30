-- V10 keeps Discord as an interaction surface only. These functions resolve a
-- verified Discord identity to an existing account, then delegate mutations to
-- the same Scheduler RPCs used by the web application.

create or replace function public.trpg_v10_bot_resolve_account(p_discord_user_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare account_id uuid;
begin
    select profile.id
    into account_id
    from public.profiles profile
    where profile.discord_user_id = nullif(trim(coalesce(p_discord_user_id, '')), '');

    if account_id is null then
        raise exception 'Discord account is not linked to RELMUA' using errcode = '28000';
    end if;

    return account_id;
end;
$$;

create or replace function public.trpg_v10_bot_set_actor(p_discord_user_id text)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare account_id uuid;
begin
    account_id = public.trpg_v10_bot_resolve_account(p_discord_user_id);
    perform set_config('request.jwt.claim.sub', account_id::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    return account_id;
end;
$$;

create or replace function public.trpg_v10_bot_list_schedules(
    p_discord_user_id text,
    p_limit integer default 25,
    p_offset integer default 0
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid; page_limit integer; page_offset integer; total_count integer; schedules_payload jsonb;
begin
    actor_id = public.trpg_v10_bot_set_actor(p_discord_user_id);
    page_limit = least(25, greatest(1, coalesce(p_limit, 25)));
    page_offset = greatest(0, coalesce(p_offset, 0));

    select count(*)
    into total_count
    from public.schedule_participants participant
    join public.schedules schedule on schedule.id = participant.schedule_id
    where participant.user_id = actor_id
      and schedule.status not in ('completed', 'cancelled');

    select coalesce(jsonb_agg(jsonb_build_object(
        'scheduleId', item.id,
        'title', item.title,
        'status', item.status,
        'role', item.role,
        'roundId', item.round_id,
        'roundSequence', item.round_sequence,
        'roundStatus', item.round_status,
        'unansweredCount', item.unanswered_count
    ) order by item.last_activity_at desc nulls last, item.title), '[]'::jsonb)
    into schedules_payload
    from (
        select
            schedule.id,
            schedule.title,
            schedule.status,
            participant.role,
            schedule.last_activity_at,
            round_item.id as round_id,
            round_item.sequence as round_sequence,
            round_item.status as round_status,
            coalesce((
                select count(*)
                from public.schedule_slots slot
                where slot.round_id = round_item.id
                  and slot.status = 'active'
                  and not exists (
                      select 1
                      from public.schedule_responses response
                      where response.participant_id = participant.id
                        and response.slot_id = slot.id
                        and response.candidate_revision = slot.revision
                  )
            ), 0) as unanswered_count
        from public.schedule_participants participant
        join public.schedules schedule on schedule.id = participant.schedule_id
        left join lateral (
            select round_value.*
            from public.schedule_rounds round_value
            where round_value.schedule_id = schedule.id
              and round_value.status in ('draft', 'open')
            order by round_value.sequence desc
            limit 1
        ) round_item on true
        where participant.user_id = actor_id
          and schedule.status not in ('completed', 'cancelled')
        order by schedule.last_activity_at desc nulls last, schedule.title
        limit page_limit offset page_offset
    ) item;

    return jsonb_build_object(
        'totalCount', total_count,
        'offset', page_offset,
        'schedules', schedules_payload
    );
end;
$$;

create or replace function public.trpg_v10_bot_upcoming_sessions(
    p_discord_user_id text,
    p_limit integer default 5
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid; row_limit integer; sessions_payload jsonb;
begin
    actor_id = public.trpg_v10_bot_set_actor(p_discord_user_id);
    row_limit = least(10, greatest(1, coalesce(p_limit, 5)));

    select coalesce(jsonb_agg(jsonb_build_object(
        'scheduleId', item.schedule_id,
        'title', item.title,
        'role', item.role,
        'sessionId', item.session_id,
        'sequence', item.sequence,
        'status', item.status,
        'startsAt', item.starts_at,
        'endsAt', item.ends_at
    ) order by item.starts_at), '[]'::jsonb)
    into sessions_payload
    from (
        select
            session_item.schedule_id,
            schedule.title,
            participant.role,
            session_item.id as session_id,
            session_item.sequence,
            session_item.status,
            session_item.starts_at,
            session_item.ends_at
        from public.schedule_sessions session_item
        join public.schedule_participants participant
          on participant.schedule_id = session_item.schedule_id
         and participant.user_id = actor_id
        join public.schedules schedule on schedule.id = session_item.schedule_id
        where session_item.status = 'scheduled'
          and session_item.starts_at >= now()
        order by session_item.starts_at
        limit row_limit
    ) item;

    return jsonb_build_object('sessions', sessions_payload);
end;
$$;

create or replace function public.trpg_v10_bot_schedule_context(
    p_discord_user_id text,
    p_schedule_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid; target_schedule public.schedules%rowtype; base_payload jsonb; all_responses jsonb; is_owner boolean;
begin
    actor_id = public.trpg_v10_bot_set_actor(p_discord_user_id);

    if not exists (
        select 1
        from public.schedule_participants participant
        where participant.schedule_id = p_schedule_id
          and participant.user_id = actor_id
    ) then
        raise exception 'participant access denied' using errcode = '28000';
    end if;

    select * into target_schedule
    from public.schedules schedule
    where schedule.id = p_schedule_id;

    if target_schedule.id is null then
        raise exception 'schedule not found' using errcode = 'P0002';
    end if;

    base_payload = public.schedule_account_view(target_schedule.share_id);
    if base_payload is null then
        raise exception 'schedule is not available' using errcode = '28000';
    end if;

    is_owner = target_schedule.owner_id = actor_id;
    if is_owner then
        select coalesce(jsonb_agg(jsonb_build_object(
            'slotId', response.slot_id,
            'participantId', response.participant_id,
            'answer', response.answer,
            'note', response.note,
            'candidateRevision', response.candidate_revision,
            'stale', response.candidate_revision <> slot.revision,
            'updatedAt', response.updated_at,
            'ranges', coalesce((
                select jsonb_agg(jsonb_build_object(
                    'startMinute', range_item.start_minute,
                    'endMinute', range_item.end_minute,
                    'answer', range_item.answer,
                    'sortOrder', range_item.sort_order,
                    'updatedAt', range_item.updated_at
                ) order by range_item.sort_order)
                from public.schedule_response_ranges range_item
                where range_item.response_id = response.id
            ), '[]'::jsonb)
        ) order by response.updated_at), '[]'::jsonb)
        into all_responses
        from public.schedule_responses response
        join public.schedule_slots slot on slot.id = response.slot_id
        join public.schedule_rounds round_item on round_item.id = slot.round_id
        where response.schedule_id = p_schedule_id
          and slot.status = 'active'
          and round_item.status = 'open';
    else
        all_responses = '[]'::jsonb;
    end if;

    return base_payload || jsonb_build_object(
        'bot', jsonb_build_object('isOwner', is_owner, 'allResponses', all_responses)
    );
end;
$$;

create or replace function public.trpg_v10_bot_upsert_response(
    p_discord_user_id text,
    p_schedule_id uuid,
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
declare actor_id uuid; target_schedule public.schedules%rowtype;
begin
    actor_id = public.trpg_v10_bot_set_actor(p_discord_user_id);
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id;
    if target_schedule.id is null then raise exception 'schedule not found' using errcode = 'P0002'; end if;
    if not exists (select 1 from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.user_id = actor_id) then
        raise exception 'participant access denied' using errcode = '28000';
    end if;
    return public.schedule_account_upsert_response(target_schedule.share_id, p_slot_id, p_answer, p_note, p_ranges);
end;
$$;

create or replace function public.trpg_v10_bot_personal_availability(p_discord_user_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
    perform public.trpg_v10_bot_set_actor(p_discord_user_id);
    return public.trpg_v31_get_personal_availability();
end;
$$;

create or replace function public.trpg_v10_bot_confirmed_slots(p_discord_user_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_id uuid; slots_payload jsonb;
begin
    actor_id = public.trpg_v10_bot_set_actor(p_discord_user_id);
    select coalesce(jsonb_agg(jsonb_build_object(
        'scheduleId', confirmed.schedule_id,
        'status', confirmed.status,
        'startsAt', confirmed.starts_at,
        'endsAt', confirmed.ends_at
    ) order by confirmed.starts_at), '[]'::jsonb)
    into slots_payload
    from public.schedule_confirmed_slots confirmed
    join public.schedule_participants participant
      on participant.schedule_id = confirmed.schedule_id
     and participant.user_id = actor_id
    where confirmed.status in ('held', 'confirmed')
      and confirmed.ends_at >= now();
    return jsonb_build_object('confirmedSlots', slots_payload);
end;
$$;

create or replace function public.trpg_v10_bot_confirm_recommendation(
    p_discord_user_id text,
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
begin
    perform public.trpg_v10_bot_set_actor(p_discord_user_id);
    return public.trpg_v6_confirm_recommendation_plan(p_schedule_id, p_round_id, p_items, p_snapshot_at);
end;
$$;

revoke all on function public.trpg_v10_bot_resolve_account(text) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_set_actor(text) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_list_schedules(text, integer, integer) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_upcoming_sessions(text, integer) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_schedule_context(text, uuid) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_upsert_response(text, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_personal_availability(text) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_confirmed_slots(text) from public, anon, authenticated;
revoke all on function public.trpg_v10_bot_confirm_recommendation(text, uuid, uuid, jsonb, timestamptz) from public, anon, authenticated;

grant execute on function public.trpg_v10_bot_list_schedules(text, integer, integer) to service_role;
grant execute on function public.trpg_v10_bot_upcoming_sessions(text, integer) to service_role;
grant execute on function public.trpg_v10_bot_schedule_context(text, uuid) to service_role;
grant execute on function public.trpg_v10_bot_upsert_response(text, uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.trpg_v10_bot_personal_availability(text) to service_role;
grant execute on function public.trpg_v10_bot_confirmed_slots(text) to service_role;
grant execute on function public.trpg_v10_bot_confirm_recommendation(text, uuid, uuid, jsonb, timestamptz) to service_role;
