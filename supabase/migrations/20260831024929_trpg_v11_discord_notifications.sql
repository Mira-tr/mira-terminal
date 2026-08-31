-- V11 keeps Discord delivery asynchronous. Scheduler mutations remain the
-- source of truth; notifications are durable, deduplicated side effects.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.schedule_notification_preferences (
    profile_id uuid primary key references public.profiles(id) on delete cascade,
    session_confirmed boolean not null default true,
    response_stale boolean not null default true,
    round_opened boolean not null default true,
    response_reminder boolean not null default true,
    session_day_before boolean not null default true,
    session_same_day boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.schedule_notification_deliveries (
    id uuid primary key default extensions.gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    type text not null check (type in (
        'session_confirmed',
        'response_stale',
        'round_opened',
        'response_reminder',
        'session_day_before',
        'session_same_day'
    )),
    schedule_id uuid references public.schedules(id) on delete cascade,
    round_id uuid references public.schedule_rounds(id) on delete cascade,
    session_id uuid references public.schedule_sessions(id) on delete cascade,
    slot_id uuid references public.schedule_slots(id) on delete set null,
    dedupe_key text not null unique,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'queued' check (status in ('queued', 'sending', 'retry', 'sent', 'failed')),
    attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
    next_attempt_at timestamptz not null default now(),
    last_attempt_at timestamptz,
    sent_at timestamptz,
    error_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists schedule_notification_deliveries_due_idx
on public.schedule_notification_deliveries (status, next_attempt_at, created_at)
where status in ('queued', 'retry');

create index if not exists schedule_notification_deliveries_profile_idx
on public.schedule_notification_deliveries (profile_id, created_at desc);

create or replace function public.trpg_v11_touch_notification_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trpg_v11_touch_notification_preferences_before_write on public.schedule_notification_preferences;
create trigger trpg_v11_touch_notification_preferences_before_write
before update on public.schedule_notification_preferences
for each row execute function public.trpg_v11_touch_notification_row();

drop trigger if exists trpg_v11_touch_notification_deliveries_before_write on public.schedule_notification_deliveries;
create trigger trpg_v11_touch_notification_deliveries_before_write
before update on public.schedule_notification_deliveries
for each row execute function public.trpg_v11_touch_notification_row();

alter table public.schedule_notification_preferences enable row level security;
alter table public.schedule_notification_deliveries enable row level security;
revoke all on table public.schedule_notification_preferences from anon, authenticated;
revoke all on table public.schedule_notification_deliveries from anon, authenticated;

create or replace function public.trpg_v11_queue_notification(
    p_profile_id uuid,
    p_type text,
    p_schedule_id uuid,
    p_round_id uuid default null,
    p_session_id uuid default null,
    p_slot_id uuid default null,
    p_dedupe_key text default '',
    p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if p_profile_id is null or p_type not in (
        'session_confirmed', 'response_stale', 'round_opened',
        'response_reminder', 'session_day_before', 'session_same_day'
    ) or char_length(trim(coalesce(p_dedupe_key, ''))) < 1 then
        return;
    end if;

    insert into public.schedule_notification_deliveries (
        profile_id, type, schedule_id, round_id, session_id, slot_id, dedupe_key, payload
    ) values (
        p_profile_id, p_type, p_schedule_id, p_round_id, p_session_id, p_slot_id,
        p_dedupe_key, coalesce(p_payload, '{}'::jsonb)
    ) on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.trpg_v11_request_notification_dispatch()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare endpoint text; dispatch_key text;
begin
    select decrypted_secret into endpoint
    from vault.decrypted_secrets
    where name = 'relmua_v11_notification_dispatch_url';
    select decrypted_secret into dispatch_key
    from vault.decrypted_secrets
    where name = 'relmua_v11_notification_dispatch_key';

    if endpoint is null or dispatch_key is null then
        return;
    end if;

    perform net.http_post(
        url := endpoint,
        headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-relmua-notification-dispatch-key', dispatch_key
        ),
        body := jsonb_build_object('source', 'event'),
        timeout_milliseconds := 5000
    );
exception when others then
    -- Delivery remains queued. A transient network fault must never roll back
    -- a Scheduler mutation.
    return;
end;
$$;

create or replace function public.trpg_v11_enqueue_round_opened(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_round public.schedule_rounds%rowtype;
begin
    select * into target_round from public.schedule_rounds where id = p_round_id;
    if target_round.id is null or target_round.status <> 'open' then return; end if;
    if not exists (select 1 from public.schedule_slots where round_id = p_round_id and status = 'active') then return; end if;

    perform public.trpg_v11_queue_notification(
        profile.id, 'round_opened', target_round.schedule_id, target_round.id, null, null,
        format('round_opened:%s:%s', target_round.id, profile.id),
        jsonb_build_object('candidateCount', candidate_counts.count)
    )
    from public.schedule_participants participant
    join public.profiles profile on profile.id = participant.user_id
    left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
    cross join lateral (
        select count(*)::integer as count from public.schedule_slots where round_id = target_round.id and status = 'active'
    ) candidate_counts
    where participant.schedule_id = target_round.schedule_id
      and participant.role <> 'viewer'
      and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
      and coalesce(preference.round_opened, true);

    perform public.trpg_v11_request_notification_dispatch();
end;
$$;

create or replace function public.trpg_v11_schedule_slot_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if tg_op = 'INSERT' then
        if (select status from public.schedule_rounds where id = new.round_id) = 'open'
           and (select count(*) from public.schedule_slots where round_id = new.round_id and status = 'active') = 1 then
            perform public.trpg_v11_enqueue_round_opened(new.round_id);
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' and new.revision > old.revision then
        perform public.trpg_v11_queue_notification(
            profile.id, 'response_stale', new.schedule_id, new.round_id, null, new.id,
            format('response_stale:%s:%s:%s', new.id, new.revision, profile.id),
            jsonb_build_object('revision', new.revision)
        )
        from public.schedule_responses response
        join public.schedule_participants participant on participant.id = response.participant_id
        join public.profiles profile on profile.id = participant.user_id
        left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
        where response.slot_id = new.id
          and response.candidate_revision <> new.revision
          and participant.role <> 'viewer'
          and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
          and coalesce(preference.response_stale, true);
        perform public.trpg_v11_request_notification_dispatch();
    end if;
    return new;
end;
$$;

drop trigger if exists trpg_v11_schedule_slot_after_write on public.schedule_slots;
create trigger trpg_v11_schedule_slot_after_write
after insert or update of revision on public.schedule_slots
for each row execute function public.trpg_v11_schedule_slot_trigger();

create or replace function public.trpg_v11_round_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.status = 'open' and old.status is distinct from new.status then
        perform public.trpg_v11_enqueue_round_opened(new.id);
    end if;

    if new.status = 'confirmed' and old.status is distinct from new.status then
        perform public.trpg_v11_queue_notification(
            profile.id, 'session_confirmed', new.schedule_id, new.id, null, null,
            format('session_confirmed:%s:%s', new.id, profile.id),
            '{}'::jsonb
        )
        from public.schedule_participants participant
        join public.profiles profile on profile.id = participant.user_id
        left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
        where participant.schedule_id = new.schedule_id
          and participant.role <> 'viewer'
          and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
          and coalesce(preference.session_confirmed, true);
        perform public.trpg_v11_request_notification_dispatch();
    end if;
    return new;
end;
$$;

drop trigger if exists trpg_v11_round_status_after_write on public.schedule_rounds;
create trigger trpg_v11_round_status_after_write
after update of status on public.schedule_rounds
for each row execute function public.trpg_v11_round_status_trigger();

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

    insert into public.schedule_notification_deliveries (profile_id, type, schedule_id, round_id, session_id, dedupe_key, payload)
    select profile.id, 'session_day_before', session_item.schedule_id, session_item.round_id, session_item.id,
           format('session_day_before:%s:%s', session_item.id, profile.id), '{}'::jsonb
    from public.schedule_sessions session_item
    join public.schedules schedule on schedule.id = session_item.schedule_id
    join public.schedule_participants participant on participant.schedule_id = schedule.id
    join public.profiles profile on profile.id = participant.user_id
    left join public.schedule_notification_preferences preference on preference.profile_id = profile.id
    where session_item.status = 'scheduled'
      and ((p_now at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::date = ((session_item.starts_at at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::date - 1))
      and (p_now at time zone coalesce(schedule.timezone, 'Asia/Tokyo'))::time >= time '10:00'
      and participant.role <> 'viewer'
      and nullif(trim(coalesce(profile.discord_user_id, '')), '') is not null
      and coalesce(preference.session_day_before, true)
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

create or replace function public.trpg_v11_run_notification_cycle()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    perform public.trpg_v11_enqueue_scheduled_notifications(now());
    perform public.trpg_v11_request_notification_dispatch();
end;
$$;

select cron.schedule('relmua-v11-discord-notifications', '*/30 * * * *', 'select public.trpg_v11_run_notification_cycle()');

create or replace function public.trpg_v11_take_notification_deliveries(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare claimed_payload jsonb;
begin
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
        ) end
    ) order by delivery.created_at), '[]'::jsonb)
    into claimed_payload
    from updated delivery
    join public.profiles profile on profile.id = delivery.profile_id
    left join public.schedules schedule on schedule.id = delivery.schedule_id
    left join public.schedule_rounds round_item on round_item.id = delivery.round_id
    left join public.schedule_slots slot on slot.id = delivery.slot_id;

    return claimed_payload;
end;
$$;

create or replace function public.trpg_v11_finish_notification_deliveries(
    p_delivery_ids uuid[],
    p_outcome text,
    p_retry_after_seconds integer default null,
    p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if p_outcome not in ('sent', 'retry', 'failed') then
        raise exception 'invalid notification outcome' using errcode = '22023';
    end if;
    update public.schedule_notification_deliveries
    set status = case
            when p_outcome = 'sent' then 'sent'
            when p_outcome = 'retry' and attempts < 5 then 'retry'
            else 'failed'
        end,
        sent_at = case when p_outcome = 'sent' then now() else sent_at end,
        next_attempt_at = case when p_outcome = 'retry' and attempts < 5 then now() + make_interval(secs => least(86400, greatest(30, coalesce(p_retry_after_seconds, 300)))) else next_attempt_at end,
        error_code = left(nullif(trim(coalesce(p_error_code, '')), ''), 80)
    where id = any(coalesce(p_delivery_ids, array[]::uuid[]))
      and status = 'sending';
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
        'sessionSameDay', preference.session_same_day
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
        session_same_day = case when p_key = 'sessionSameDay' then p_enabled else session_same_day end
    where profile_id = actor_profile_id
      and p_key in ('sessionConfirmed', 'responseStale', 'roundOpened', 'responseReminder', 'sessionDayBefore', 'sessionSameDay');
    if not found then raise exception 'invalid notification preference' using errcode = '22023'; end if;
    return public.trpg_v11_bot_notification_preferences(p_discord_user_id);
end;
$$;

revoke all on function public.trpg_v11_queue_notification(uuid, text, uuid, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v11_request_notification_dispatch() from public, anon, authenticated;
revoke all on function public.trpg_v11_enqueue_round_opened(uuid) from public, anon, authenticated;
revoke all on function public.trpg_v11_enqueue_scheduled_notifications(timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v11_run_notification_cycle() from public, anon, authenticated;
revoke all on function public.trpg_v11_take_notification_deliveries(integer) from public, anon, authenticated;
revoke all on function public.trpg_v11_finish_notification_deliveries(uuid[], text, integer, text) from public, anon, authenticated;
revoke all on function public.trpg_v11_bot_notification_preferences(text) from public, anon, authenticated;
revoke all on function public.trpg_v11_bot_set_notification_preference(text, text, boolean) from public, anon, authenticated;

grant execute on function public.trpg_v11_take_notification_deliveries(integer) to service_role;
grant execute on function public.trpg_v11_finish_notification_deliveries(uuid[], text, integer, text) to service_role;
grant execute on function public.trpg_v11_bot_notification_preferences(text) to service_role;
grant execute on function public.trpg_v11_bot_set_notification_preference(text, text, boolean) to service_role;
