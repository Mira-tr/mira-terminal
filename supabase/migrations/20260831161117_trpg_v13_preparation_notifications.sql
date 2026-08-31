-- V13 extends the V11 scheduled delivery cycle. Preparation stays a compact
-- per-assignee supplement to the nearest upcoming Session, never a broadcast.

alter table public.schedule_notification_preferences
    add column preparation_reminder boolean not null default true;

alter table public.schedule_notification_deliveries
    drop constraint if exists schedule_notification_deliveries_type_check;
alter table public.schedule_notification_deliveries
    add constraint schedule_notification_deliveries_type_check check (type in (
        'session_confirmed',
        'response_stale',
        'round_opened',
        'response_reminder',
        'session_day_before',
        'session_same_day',
        'preparation_reminder'
    ));

create index schedule_preparation_items_session_assignee_pending_idx
on public.schedule_preparation_items(session_id, assignee_participant_id, sort_order)
where archived_at is null and status = 'pending' and session_id is not null;

-- This sealed helper is deliberately only callable by the server-side V11
-- delivery functions. It resolves a Session's current assigned work at send
-- time, so completed items do not leak into an already queued reminder.
create or replace function public.trpg_v13_pending_preparation_for_session(
    p_session_id uuid,
    p_profile_id uuid,
    p_now timestamptz default now()
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select jsonb_build_object(
        'count', count(*),
        'items', coalesce(jsonb_agg(jsonb_build_object(
            'id', item.id,
            'title', item.title
        ) order by item.sort_order, item.created_at), '[]'::jsonb)
    )
    from public.schedule_sessions target_session
    join public.schedule_participants recipient
      on recipient.schedule_id = target_session.schedule_id
     and recipient.user_id = p_profile_id
    join public.schedule_preparation_items item
      on item.schedule_id = target_session.schedule_id
     and item.assignee_participant_id = recipient.id
    where target_session.id = p_session_id
      and target_session.status = 'scheduled'
      and item.status = 'pending'
      and item.archived_at is null
      and (
          item.session_id = target_session.id
          or (
              item.session_id is null
              and item.round_id = target_session.round_id
          )
          or (
              item.session_id is null
              and item.round_id is null
              and not exists (
                  select 1
                  from public.schedule_sessions earlier_session
                  where earlier_session.schedule_id = target_session.schedule_id
                    and earlier_session.status = 'scheduled'
                    and earlier_session.starts_at >= p_now
                    and earlier_session.starts_at < target_session.starts_at
              )
          )
      );
$$;

create or replace function public.trpg_v11_enqueue_scheduled_notifications(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare queued_count integer := 0; inserted_count integer := 0;
begin
    insert into public.schedule_notification_deliveries (profile_id, type, schedule_id, round_id, dedupe_key, payload)
    select profile.id, 'response_reminder', round_item.schedule_id, round_item.id,
           format('response_reminder:%s:%s:%s', round_item.id, profile.id, (p_now at time zone 'Asia/Tokyo')::date),
           '{}'::jsonb
    from public.schedule_rounds round_item
    join public.schedules schedule on schedule.id = round_item.schedule_id
    join public.schedule_participants participant on participant.schedule_id = schedule.id
    join public.profiles profile on profile.id = participant.user_id
    left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
    where round_item.status = 'open'
      and round_item.opened_at <= p_now - interval '24 hours'
      and participant.role <> 'viewer'
      and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
      and coalesce(preference.response_reminder, true)
      and exists (
          select 1 from public.schedule_slots slot
          where slot.round_id = round_item.id and slot.status = 'active'
            and not exists (
                select 1 from public.schedule_responses response
                where response.participant_id = participant.id
                  and response.slot_id = slot.id
                  and response.candidate_revision = slot.revision
            )
      )
      and not exists (
          select 1 from public.schedule_slots slot
          join public.schedule_responses response on response.slot_id = slot.id and response.participant_id = participant.id
          where slot.round_id = round_item.id
            and slot.status = 'active'
            and response.candidate_revision <> slot.revision
      )
    on conflict (dedupe_key) do nothing;
    get diagnostics queued_count = row_count;

    -- One delivery per recipient/session. With the normal day-before setting
    -- ON, Preparation is embedded in the existing reminder. If it is OFF,
    -- Preparation can still send its own focused reminder.
    insert into public.schedule_notification_deliveries (profile_id, type, schedule_id, round_id, session_id, dedupe_key, payload)
    select profile.id,
           case when coalesce(preference.session_day_before, true) then 'session_day_before' else 'preparation_reminder' end,
           session_item.schedule_id,
           session_item.round_id,
           session_item.id,
           format('session_day_before:%s:%s', session_item.id, profile.id),
           jsonb_build_object(
               'preparationCount', coalesce((preparation.payload ->> 'count')::integer, 0),
               'preparationItems', coalesce(preparation.payload -> 'items', '[]'::jsonb)
           )
    from public.schedule_sessions session_item
    join public.schedules schedule on schedule.id = session_item.schedule_id
    join public.schedule_participants participant on participant.schedule_id = schedule.id
    join public.profiles profile on profile.id = participant.user_id
    left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
    cross join lateral (
        select public.trpg_v13_pending_preparation_for_session(session_item.id, profile.id, p_now) as payload
    ) preparation
    where session_item.status = 'scheduled'
      and ((p_now at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::date = ((session_item.starts_at at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::date - 1))
      and (p_now at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::time >= time '10:00'
      and participant.role <> 'viewer'
      and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
      and (
          coalesce(preference.session_day_before, true)
          or (
              coalesce(preference.preparation_reminder, true)
              and coalesce((preparation.payload ->> 'count')::integer, 0) > 0
          )
      )
    on conflict (dedupe_key) do nothing;
    get diagnostics inserted_count = row_count;
    queued_count := queued_count + inserted_count;

    insert into public.schedule_notification_deliveries (profile_id, type, schedule_id, round_id, session_id, dedupe_key, payload)
    select profile.id, 'session_same_day', session_item.schedule_id, session_item.round_id, session_item.id,
           format('session_same_day:%s:%s', session_item.id, profile.id), '{}'::jsonb
    from public.schedule_sessions session_item
    join public.schedules schedule on schedule.id = session_item.schedule_id
    join public.schedule_participants participant on participant.schedule_id = schedule.id
    join public.profiles profile on profile.id = participant.user_id
    left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
    where session_item.status = 'scheduled'
      and session_item.starts_at > p_now
      and (p_now at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::date = (session_item.starts_at at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::date
      and (p_now at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::time >= time '10:00'
      and participant.role <> 'viewer'
      and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
      and coalesce(preference.session_same_day, false)
    on conflict (dedupe_key) do nothing;
    get diagnostics inserted_count = row_count;
    queued_count := queued_count + inserted_count;

    return queued_count;
end;
$$;

create or replace function public.trpg_v11_take_notification_deliveries(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare claimed_payload jsonb;
begin
    -- A standalone Preparation reminder is obsolete when the recipient has
    -- completed the last assigned item before the dispatcher claims it.
    update public.schedule_notification_deliveries delivery
    set status = 'sent', sent_at = now(), error_code = 'preparation_completed'
    where delivery.status in ('queued', 'retry')
      and delivery.type = 'preparation_reminder'
      and delivery.next_attempt_at <= now()
      and coalesce((public.trpg_v13_pending_preparation_for_session(delivery.session_id, delivery.profile_id, now()) ->> 'count')::integer, 0) = 0;

    with claimed as (
        select id
        from public.schedule_notification_deliveries
        where status in ('queued', 'retry')
          and next_attempt_at <= now()
        order by created_at
        limit least(25, greatest(1, coalesce(p_limit, 20)))
        for update skip locked
    ), updated as (
        update public.schedule_notification_deliveries delivery
        set status = 'sending', attempts = attempts + 1, last_attempt_at = now()
        from claimed
        where delivery.id = claimed.id
        returning delivery.*
    )
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', delivery.id,
        'type', delivery.type,
        'profileId', delivery.profile_id,
        'discordUserId', profile.discord_user_id,
        'scheduleId', delivery.schedule_id,
        'roundId', delivery.round_id,
        'sessionId', delivery.session_id,
        'slotId', delivery.slot_id,
        'attempts', delivery.attempts,
        'payload', delivery.payload,
        'scheduleTitle', schedule.title,
        'timezone', coalesce(schedule.timezone, 'Asia/Tokyo'),
        'roundSequence', round_item.sequence,
        'candidateCount', (select count(*) from public.schedule_slots slot where slot.round_id = delivery.round_id and slot.status = 'active'),
        'sessions', coalesce((
            select jsonb_agg(jsonb_build_object('id', session_item.id, 'startsAt', session_item.starts_at, 'endsAt', session_item.ends_at) order by session_item.starts_at)
            from public.schedule_sessions session_item
            where session_item.schedule_id = delivery.schedule_id
              and (delivery.round_id is null or session_item.round_id = delivery.round_id)
              and (delivery.type not in ('session_day_before', 'preparation_reminder') or session_item.id = delivery.session_id)
              and session_item.status = 'scheduled'
        ), '[]'::jsonb),
        'slotStartsAt', slot.starts_at,
        'slotEndsAt', slot.ends_at,
        'outstandingCount', case when delivery.round_id is null then 0 else (
            select count(*)
            from public.schedule_slots active_slot
            join public.schedule_participants participant on participant.schedule_id = active_slot.schedule_id and participant.user_id = delivery.profile_id
            where active_slot.round_id = delivery.round_id
              and active_slot.status = 'active'
              and not exists (
                  select 1 from public.schedule_responses response
                  where response.participant_id = participant.id
                    and response.slot_id = active_slot.id
                    and response.candidate_revision = active_slot.revision
              )
        ) end,
        'preparationCount', case when delivery.type in ('session_day_before', 'preparation_reminder')
            then coalesce((preparation.payload ->> 'count')::integer, 0)
            else 0 end,
        'preparationItems', case when delivery.type in ('session_day_before', 'preparation_reminder')
            then coalesce(preparation.payload -> 'items', '[]'::jsonb)
            else '[]'::jsonb end
    ) order by delivery.created_at), '[]'::jsonb)
    into claimed_payload
    from updated delivery
    join public.profiles profile on profile.id = delivery.profile_id
    left join public.schedules schedule on schedule.id = delivery.schedule_id
    left join public.schedule_rounds round_item on round_item.id = delivery.round_id
    left join public.schedule_slots slot on slot.id = delivery.slot_id
    left join lateral (
        select public.trpg_v13_pending_preparation_for_session(delivery.session_id, delivery.profile_id, now()) as payload
    ) preparation on delivery.type in ('session_day_before', 'preparation_reminder');

    return claimed_payload;
end;
$$;

create or replace function public.trpg_v11_bot_notification_preferences(p_discord_user_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_profile_id uuid; preference public.schedule_notification_preferences%rowtype;
begin
    actor_profile_id = public.trpg_v10_bot_resolve_account(p_discord_user_id);
    insert into public.schedule_notification_preferences (profile_id)
    values (actor_profile_id)
    on conflict (profile_id) do nothing;
    select * into preference from public.schedule_notification_preferences where profile_id = actor_profile_id;
    return jsonb_build_object(
        'sessionConfirmed', preference.session_confirmed,
        'responseStale', preference.response_stale,
        'roundOpened', preference.round_opened,
        'responseReminder', preference.response_reminder,
        'sessionDayBefore', preference.session_day_before,
        'sessionSameDay', preference.session_same_day,
        'preparationReminder', preference.preparation_reminder
    );
end;
$$;

create or replace function public.trpg_v11_bot_set_notification_preference(
    p_discord_user_id text,
    p_key text,
    p_enabled boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare actor_profile_id uuid;
begin
    actor_profile_id = public.trpg_v10_bot_resolve_account(p_discord_user_id);
    insert into public.schedule_notification_preferences (profile_id)
    values (actor_profile_id)
    on conflict (profile_id) do nothing;
    update public.schedule_notification_preferences
    set session_confirmed = case when p_key = 'sessionConfirmed' then p_enabled else session_confirmed end,
        response_stale = case when p_key = 'responseStale' then p_enabled else response_stale end,
        round_opened = case when p_key = 'roundOpened' then p_enabled else round_opened end,
        response_reminder = case when p_key = 'responseReminder' then p_enabled else response_reminder end,
        session_day_before = case when p_key = 'sessionDayBefore' then p_enabled else session_day_before end,
        session_same_day = case when p_key = 'sessionSameDay' then p_enabled else session_same_day end,
        preparation_reminder = case when p_key = 'preparationReminder' then p_enabled else preparation_reminder end
    where profile_id = actor_profile_id
      and p_key in ('sessionConfirmed', 'responseStale', 'roundOpened', 'responseReminder', 'sessionDayBefore', 'sessionSameDay', 'preparationReminder');
    if not found then raise exception 'invalid notification preference' using errcode = '22023'; end if;
    return public.trpg_v11_bot_notification_preferences(p_discord_user_id);
end;
$$;

revoke all on function public.trpg_v13_pending_preparation_for_session(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v11_enqueue_scheduled_notifications(timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v11_take_notification_deliveries(integer) from public, anon, authenticated;
revoke all on function public.trpg_v11_bot_notification_preferences(text) from public, anon, authenticated;
revoke all on function public.trpg_v11_bot_set_notification_preference(text, text, boolean) from public, anon, authenticated;

grant execute on function public.trpg_v11_take_notification_deliveries(integer) to service_role;
grant execute on function public.trpg_v11_bot_notification_preferences(text) to service_role;
grant execute on function public.trpg_v11_bot_set_notification_preference(text, text, boolean) to service_role;
