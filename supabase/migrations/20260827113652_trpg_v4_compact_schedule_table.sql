-- RELMUA TRPG Scheduler V4 compact table support.
-- Additive only: account names retain their profile source while a session can
-- opt into an explicit override. Multi-day confirmation is revalidated inside
-- the database before replacing a schedule's confirmed plan.

alter table public.schedule_participants
    add column if not exists display_name_override text;

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'schedule_participants_display_name_override_length'
    ) then
        alter table public.schedule_participants
            add constraint schedule_participants_display_name_override_length
            check (display_name_override is null or char_length(display_name_override) between 1 and 80);
    end if;
end;
$$;

-- Preserve previously entered per-session names when they differ from the
-- account profile. Guest names remain local participant names.
update public.schedule_participants participant
set display_name_override = participant.display_name
from public.profiles profile
where participant.user_id = profile.id
  and participant.display_name_override is null
  and participant.display_name is distinct from profile.display_name;

create or replace function public.trpg_v2_upsert_profile_from_auth()
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    profile_payload jsonb;
    profile_name text;
    profile_avatar text;
    profile_discord_id text;
    saved_profile public.profiles%rowtype;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    profile_payload = public.trpg_v2_auth_profile();
    profile_name = left(trim(coalesce(profile_payload ->> 'displayName', 'RELMUA User')), 80);
    profile_avatar = nullif(left(trim(coalesce(profile_payload ->> 'avatarUrl', '')), 500), '');
    profile_discord_id = nullif(left(trim(coalesce(profile_payload ->> 'discordUserId', '')), 80), '');

    if char_length(profile_name) < 1 then
        profile_name = 'RELMUA User';
    end if;

    insert into public.profiles (id, display_name, avatar_url, discord_user_id)
    values (auth.uid(), profile_name, profile_avatar, profile_discord_id)
    on conflict (id) do update set
        avatar_url = excluded.avatar_url,
        discord_user_id = coalesce(excluded.discord_user_id, public.profiles.discord_user_id)
    returning * into saved_profile;

    return jsonb_build_object(
        'id', saved_profile.id,
        'displayName', saved_profile.display_name,
        'avatarUrl', saved_profile.avatar_url,
        'discordUserId', saved_profile.discord_user_id
    );
end;
$$;

create or replace function public.trpg_v4_update_account_display_name(p_display_name text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    saved_name text;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    saved_name = left(trim(coalesce(p_display_name, '')), 80);
    if char_length(saved_name) < 1 then
        raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
    end if;

    update public.profiles set display_name = saved_name where id = auth.uid();
    if not found then
        raise exception 'profile not found' using errcode = 'P0002';
    end if;

    update public.schedule_participants
    set display_name = saved_name
    where user_id = auth.uid()
      and display_name_override is null;

    return jsonb_build_object('displayName', saved_name);
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
    profile_name text;
    requested_name text;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    requested_name = left(trim(coalesce(p_display_name, '')), 80);
    select display_name into profile_name from public.profiles where id = auth.uid();

    update public.schedule_participants participant
    set display_name_override = case when requested_name = '' then null else requested_name end,
        display_name = case when requested_name = '' then coalesce(profile_name, participant.display_name) else requested_name end
    where participant.schedule_id = p_schedule_id
      and participant.user_id = auth.uid()
    returning * into saved_participant;

    if saved_participant.id is null then
        raise exception 'participant access denied' using errcode = '28000';
    end if;

    if requested_name <> '' and char_length(requested_name) < 1 then
        raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
    end if;

    return jsonb_build_object(
        'scheduleId', p_schedule_id,
        'participantId', saved_participant.id,
        'displayName', saved_participant.display_name,
        'usesAccountDisplayName', saved_participant.display_name_override is null
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

    select * into target_schedule from public.schedules schedule
    where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now();
    if target_schedule.id is null then
        raise exception 'schedule is not available' using errcode = '28000';
    end if;

    select profile.display_name into profile_name from public.profiles profile where profile.id = auth.uid();
    if profile_name is null then
        profile_name = left(trim(coalesce(p_display_name, '')), 80);
        if char_length(profile_name) < 1 then
            raise exception 'display name must be 1 to 80 characters' using errcode = '22023';
        end if;
        insert into public.profiles (id, display_name) values (auth.uid(), profile_name) on conflict (id) do nothing;
        select profile.display_name into profile_name from public.profiles profile where profile.id = auth.uid();
    end if;

    select * into existing_participant from public.schedule_participants participant
    where participant.schedule_id = target_schedule.id and participant.user_id = auth.uid();

    if existing_participant.id is null then
        select count(*) into participant_count from public.schedule_participants participant where participant.schedule_id = target_schedule.id;
        if participant_count >= target_schedule.max_participants then
            raise exception 'participant limit reached' using errcode = '54000';
        end if;
        insert into public.schedule_participants (schedule_id, user_id, display_name, role, required, sort_order)
        values (target_schedule.id, auth.uid(), profile_name,
            case when target_schedule.owner_id = auth.uid() then 'owner' else 'participant' end,
            target_schedule.owner_id = auth.uid(), participant_count);
    elsif existing_participant.display_name_override is null then
        update public.schedule_participants set display_name = profile_name where id = existing_participant.id;
    end if;

    return public.schedule_account_view(p_share_id);
end;
$$;

create or replace function public.trpg_v4_confirm_recommendation_plan(
    p_schedule_id uuid,
    p_items jsonb,
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
    item jsonb;
    target_slot public.schedule_slots%rowtype;
    required_participant public.schedule_participants%rowtype;
    participant_response public.schedule_responses%rowtype;
    start_value integer;
    end_value integer;
    latest_change timestamptz;
    confirmed_start timestamptz;
    confirmed_end timestamptz;
    position integer := 0;
    seen_slots uuid[] := array[]::uuid[];
    saved_items jsonb := '[]'::jsonb;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) < 1 or jsonb_array_length(p_items) > 50 then
        raise exception 'plan must contain 1 to 50 items' using errcode = '22023';
    end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    select max(change_at) into latest_change from (
        select slot.updated_at as change_at from public.schedule_slots slot where slot.schedule_id = p_schedule_id
        union all select participant.updated_at from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.role <> 'viewer'
        union all select response.updated_at from public.schedule_responses response join public.schedule_participants participant on participant.id = response.participant_id where response.schedule_id = p_schedule_id and participant.role <> 'viewer'
        union all select range_item.updated_at from public.schedule_response_ranges range_item join public.schedule_responses response on response.id = range_item.response_id join public.schedule_participants participant on participant.id = response.participant_id where response.schedule_id = p_schedule_id and participant.role <> 'viewer'
    ) changes;
    if p_snapshot_at is null or (latest_change is not null and date_trunc('milliseconds', latest_change) > date_trunc('milliseconds', p_snapshot_at)) then
        raise exception 'recommendation is stale; review the latest responses' using errcode = '40001';
    end if;

    delete from public.schedule_confirmed_slots where schedule_id = p_schedule_id;
    for item in select value from jsonb_array_elements(p_items)
    loop
        target_slot.id = null;
        select * into target_slot from public.schedule_slots slot where slot.id = nullif(item ->> 'slotId', '')::uuid and slot.schedule_id = p_schedule_id for update;
        start_value = nullif(item ->> 'startMinute', '')::integer;
        end_value = nullif(item ->> 'endMinute', '')::integer;
        if target_slot.id is null or target_slot.id = any(seen_slots) or start_value is null or end_value is null
            or start_value < target_slot.start_minute or end_value > target_slot.end_minute or end_value <= start_value then
            raise exception 'invalid plan candidate' using errcode = '22023';
        end if;
        seen_slots = array_append(seen_slots, target_slot.id);
        confirmed_start = (target_slot.local_date::timestamp + make_interval(mins => start_value)) at time zone target_schedule.timezone;
        confirmed_end = (target_slot.local_date::timestamp + make_interval(mins => end_value)) at time zone target_schedule.timezone;
        for required_participant in select * from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.role <> 'viewer' order by participant.sort_order for update
        loop
            participant_response.id = null;
            select * into participant_response from public.schedule_responses response where response.schedule_id = p_schedule_id and response.participant_id = required_participant.id and response.slot_id = target_slot.id for update;
            if participant_response.id is null or participant_response.answer = 'no' then raise exception 'recommendation has unavailable required participants' using errcode = '40001'; end if;
            if participant_response.answer = 'maybe' and not exists (select 1 from public.schedule_response_ranges range_item where range_item.response_id = participant_response.id and range_item.start_minute <= start_value and range_item.end_minute >= end_value) then
                raise exception 'recommendation has uncertain required participants' using errcode = '40001';
            end if;
            if required_participant.user_id is not null and exists (
                select 1 from public.schedule_confirmed_slots confirmed join public.schedule_participants other_participant on other_participant.schedule_id = confirmed.schedule_id and other_participant.user_id = required_participant.user_id
                where confirmed.schedule_id <> p_schedule_id and confirmed.status in ('held', 'confirmed') and confirmed.ends_at > confirmed_start and confirmed.starts_at < confirmed_end
            ) then raise exception 'recommendation conflicts with another confirmed session' using errcode = '40001'; end if;
        end loop;
        insert into public.schedule_confirmed_slots (schedule_id, slot_id, sequence, status, local_date, start_minute, end_minute, starts_at, ends_at, created_by)
        values (p_schedule_id, target_slot.id, position, 'confirmed', target_slot.local_date, start_value, end_value, confirmed_start, confirmed_end, auth.uid());
        saved_items = saved_items || jsonb_build_array(jsonb_build_object('slotId', target_slot.id, 'startMinute', start_value, 'endMinute', end_value));
        position = position + 1;
    end loop;
    update public.schedules set status = 'confirmed' where id = p_schedule_id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'items', saved_items);
end;
$$;

revoke all on function public.trpg_v4_update_account_display_name(text) from public, anon, authenticated;
revoke all on function public.trpg_v4_confirm_recommendation_plan(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v2_update_session_display_name(uuid, text) from public, anon, authenticated;
revoke all on function public.schedule_account_join(text, text) from public, anon, authenticated;
grant execute on function public.trpg_v4_update_account_display_name(text) to authenticated;
grant execute on function public.trpg_v4_confirm_recommendation_plan(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.trpg_v2_update_session_display_name(uuid, text) to authenticated;
grant execute on function public.schedule_account_join(text, text) to authenticated;
