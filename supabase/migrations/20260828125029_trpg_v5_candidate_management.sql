-- RELMUA TRPG Scheduler V5 candidate management.
-- Additive only: candidate history remains in schedule_slots while only active
-- revisions are eligible for new responses, recommendations, and confirmation.

alter table public.schedule_slots
    add column if not exists status text not null default 'active',
    add column if not exists revision integer not null default 1,
    add column if not exists retired_at timestamptz,
    add column if not exists retired_by uuid references auth.users(id) on delete set null;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'schedule_slots_status_check') then
        alter table public.schedule_slots add constraint schedule_slots_status_check check (status in ('active', 'retired'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'schedule_slots_revision_check') then
        alter table public.schedule_slots add constraint schedule_slots_revision_check check (revision >= 1);
    end if;
end;
$$;

alter table public.schedule_responses
    add column if not exists candidate_revision integer not null default 1;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'schedule_responses_candidate_revision_check') then
        alter table public.schedule_responses add constraint schedule_responses_candidate_revision_check check (candidate_revision >= 1);
    end if;
end;
$$;

create index if not exists schedule_slots_active_order_idx on public.schedule_slots(schedule_id, status, sort_order);
create index if not exists schedule_responses_slot_revision_idx on public.schedule_responses(slot_id, candidate_revision);

create or replace function public.trpg_v5_candidate_times(p_schedule public.schedules, p_starts_at timestamptz, p_ends_at timestamptz)
returns jsonb language plpgsql immutable set search_path = pg_catalog, public as $$
declare local_start timestamp; local_end timestamp; start_of_day timestamp; start_minute integer; end_minute integer;
begin
    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'invalid candidate time' using errcode = '22023'; end if;
    local_start = p_starts_at at time zone p_schedule.timezone;
    local_end = p_ends_at at time zone p_schedule.timezone;
    start_of_day = date_trunc('day', local_start);
    start_minute = floor(extract(epoch from (local_start - start_of_day)) / 60)::integer;
    end_minute = floor(extract(epoch from (local_end - start_of_day)) / 60)::integer;
    if local_end <= local_start or end_minute <= start_minute or end_minute > 1800 then raise exception 'candidate duration must be between one minute and 30 hours' using errcode = '22023'; end if;
    return jsonb_build_object('localDate', local_start::date, 'startMinute', start_minute, 'endMinute', end_minute);
end;
$$;

create or replace function public.trpg_v5_update_candidate(p_schedule_id uuid, p_slot_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_label text default '')
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
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
        insert into public.schedule_slots (schedule_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order, label, status, revision)
        values (p_schedule_id, (candidate_time ->> 'localDate')::date, (candidate_time ->> 'startMinute')::integer, (candidate_time ->> 'endMinute')::integer, p_starts_at, p_ends_at, next_order, target_label, 'active', 1)
        returning * into replacement_slot;
        return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', replacement_slot.id, 'retiredSlotId', target_slot.id, 'dateChanged', true, 'staleResponseCount', stale_count);
    end if;
    update public.schedule_slots set local_date = (candidate_time ->> 'localDate')::date, start_minute = (candidate_time ->> 'startMinute')::integer, end_minute = (candidate_time ->> 'endMinute')::integer, starts_at = p_starts_at, ends_at = p_ends_at, label = target_label, revision = target_slot.revision + 1, updated_at = now() where id = target_slot.id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', target_slot.id, 'dateChanged', false, 'revision', target_slot.revision + 1, 'staleResponseCount', stale_count);
end;
$$;

create or replace function public.trpg_v5_bulk_update_candidate_times(p_schedule_id uuid, p_slot_ids uuid[], p_start_minute integer, p_end_minute integer)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare target_schedule public.schedules%rowtype; target_slot public.schedule_slots%rowtype; requested_count integer; available_count integer; changed_count integer := 0; stale_count integer := 0; next_start timestamptz; next_end timestamptz;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update;
    if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    requested_count = coalesce(cardinality(p_slot_ids), 0);
    if requested_count < 1 or requested_count > 50 or p_start_minute is null or p_end_minute is null or p_start_minute < 0 or p_end_minute <= p_start_minute or p_end_minute > 1800 then raise exception 'invalid bulk candidate time' using errcode = '22023'; end if;
    if (select count(distinct slot_id) from unnest(p_slot_ids) as requested(slot_id)) <> requested_count then raise exception 'duplicate candidate selection' using errcode = '22023'; end if;
    if exists (select 1 from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = p_schedule_id and confirmed.slot_id = any(p_slot_ids)) then raise exception 'confirmed candidate cannot be edited' using errcode = '22023'; end if;
    select count(*) into available_count from public.schedule_slots slot where slot.schedule_id = p_schedule_id and slot.id = any(p_slot_ids) and slot.status = 'active';
    if available_count <> requested_count then raise exception 'candidate is not active' using errcode = 'P0002'; end if;
    for target_slot in select * from public.schedule_slots slot where slot.schedule_id = p_schedule_id and slot.id = any(p_slot_ids) and slot.status = 'active' order by slot.sort_order for update loop
        next_start = (target_slot.local_date::timestamp + make_interval(mins => p_start_minute)) at time zone target_schedule.timezone;
        next_end = (target_slot.local_date::timestamp + make_interval(mins => p_end_minute)) at time zone target_schedule.timezone;
        if target_slot.start_minute <> p_start_minute or target_slot.end_minute <> p_end_minute then
            update public.schedule_slots set start_minute = p_start_minute, end_minute = p_end_minute, starts_at = next_start, ends_at = next_end, revision = target_slot.revision + 1, updated_at = now() where id = target_slot.id;
            changed_count = changed_count + 1;
            stale_count = stale_count + (select count(*) from public.schedule_responses response where response.slot_id = target_slot.id);
        end if;
    end loop;
    return jsonb_build_object('scheduleId', p_schedule_id, 'selectedCount', requested_count, 'changedCount', changed_count, 'staleResponseCount', stale_count);
end;
$$;

create or replace function public.trpg_v5_retire_candidate(p_schedule_id uuid, p_slot_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare target_slot public.schedule_slots%rowtype; response_count integer;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if not exists (select 1 from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update) then raise exception 'owner access denied' using errcode = '28000'; end if;
    select * into target_slot from public.schedule_slots slot where slot.id = p_slot_id and slot.schedule_id = p_schedule_id for update;
    if target_slot.id is null or target_slot.status <> 'active' then raise exception 'candidate is not active' using errcode = 'P0002'; end if;
    if exists (select 1 from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = p_schedule_id and confirmed.slot_id = p_slot_id) then raise exception 'confirmed candidate cannot be retired' using errcode = '22023'; end if;
    select count(*) into response_count from public.schedule_responses response where response.slot_id = p_slot_id;
    update public.schedule_slots set status = 'retired', retired_at = now(), retired_by = auth.uid(), updated_at = now() where id = p_slot_id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', p_slot_id, 'responseCount', response_count, 'status', 'retired');
end;
$$;

create or replace function public.trpg_v5_restore_candidate(p_schedule_id uuid, p_slot_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare target_slot public.schedule_slots%rowtype;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if not exists (select 1 from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update) then raise exception 'owner access denied' using errcode = '28000'; end if;
    select * into target_slot from public.schedule_slots slot where slot.id = p_slot_id and slot.schedule_id = p_schedule_id for update;
    if target_slot.id is null or target_slot.status <> 'retired' then raise exception 'candidate is not retired' using errcode = 'P0002'; end if;
    update public.schedule_slots set status = 'active', retired_at = null, retired_by = null, updated_at = now() where id = p_slot_id;
    return jsonb_build_object('scheduleId', p_schedule_id, 'slotId', p_slot_id, 'status', 'active');
end;
$$;

create or replace function public.trpg_v5_save_response_ranges(p_response_id uuid, p_slot public.schedule_slots, p_ranges jsonb)
returns void language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare item jsonb; start_value integer; end_value integer; answer_value text; position integer := 0;
begin
    for item in select value from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) loop
        start_value = nullif(item ->> 'startMinute', '')::integer; end_value = nullif(item ->> 'endMinute', '')::integer; answer_value = nullif(item ->> 'answer', '');
        if start_value is null or end_value is null or start_value < p_slot.start_minute or end_value > p_slot.end_minute or end_value <= start_value then raise exception 'range outside candidate' using errcode = '22023'; end if;
        if answer_value is not null and answer_value not in ('yes', 'maybe', 'no') then raise exception 'invalid range answer' using errcode = '22023'; end if;
        if exists (select 1 from public.schedule_response_ranges existing where existing.response_id = p_response_id and not (existing.end_minute <= start_value or existing.start_minute >= end_value)) then raise exception 'overlapping ranges' using errcode = '22023'; end if;
        insert into public.schedule_response_ranges (response_id, start_minute, end_minute, answer, sort_order) values (p_response_id, start_value, end_value, answer_value, position);
        position = position + 1;
    end loop;
end;
$$;

create or replace function public.schedule_public_view(p_share_id text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare target_schedule public.schedules%rowtype; slot_payload jsonb; participant_payload jsonb; summary_payload jsonb; confirmed_payload jsonb;
begin
    select * into target_schedule from public.schedules schedule where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now();
    if target_schedule.id is null then return null; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', slot.id, 'localDate', slot.local_date, 'startMinute', slot.start_minute, 'endMinute', slot.end_minute, 'startsAt', slot.starts_at, 'endsAt', slot.ends_at, 'sortOrder', slot.sort_order, 'label', slot.label, 'status', slot.status, 'revision', slot.revision) order by slot.sort_order), '[]'::jsonb) into slot_payload from public.schedule_slots slot where slot.schedule_id = target_schedule.id and slot.status = 'active';
    select coalesce(jsonb_agg(jsonb_build_object('id', participant.id, 'displayName', participant.display_name, 'role', participant.role, 'required', participant.required, 'answered', exists (select 1 from public.schedule_responses response join public.schedule_slots slot on slot.id = response.slot_id where response.participant_id = participant.id and slot.status = 'active' and response.candidate_revision = slot.revision)) order by participant.sort_order), '[]'::jsonb) into participant_payload from public.schedule_participants participant where participant.schedule_id = target_schedule.id;
    select coalesce(jsonb_agg(jsonb_build_object('slotId', slot.id, 'yes', coalesce(counts.yes_count, 0), 'maybe', coalesce(counts.maybe_count, 0), 'no', coalesce(counts.no_count, 0), 'answered', coalesce(counts.answered_count, 0), 'stale', coalesce(counts.stale_count, 0)) order by slot.sort_order), '[]'::jsonb) into summary_payload from public.schedule_slots slot left join lateral (select count(*) filter (where response.candidate_revision = slot.revision and response.answer = 'yes') as yes_count, count(*) filter (where response.candidate_revision = slot.revision and response.answer = 'maybe') as maybe_count, count(*) filter (where response.candidate_revision = slot.revision and response.answer = 'no') as no_count, count(*) filter (where response.candidate_revision = slot.revision) as answered_count, count(*) filter (where response.candidate_revision <> slot.revision) as stale_count from public.schedule_responses response where response.slot_id = slot.id) counts on true where slot.schedule_id = target_schedule.id and slot.status = 'active';
    select coalesce(jsonb_agg(jsonb_build_object('id', confirmed.id, 'slotId', confirmed.slot_id, 'sequence', confirmed.sequence, 'status', confirmed.status, 'localDate', confirmed.local_date, 'startMinute', confirmed.start_minute, 'endMinute', confirmed.end_minute, 'startsAt', confirmed.starts_at, 'endsAt', confirmed.ends_at) order by confirmed.sequence), '[]'::jsonb) into confirmed_payload from public.schedule_confirmed_slots confirmed where confirmed.schedule_id = target_schedule.id;
    return jsonb_build_object('schedule', jsonb_build_object('id', target_schedule.id, 'shareId', target_schedule.share_id, 'title', target_schedule.title, 'description', target_schedule.description, 'timezone', target_schedule.timezone, 'status', target_schedule.status, 'totalMinutes', target_schedule.total_minutes, 'sessionMinutes', target_schedule.session_minutes, 'updatedAt', target_schedule.updated_at, 'lastActivityAt', target_schedule.last_activity_at, 'expiresAt', target_schedule.expires_at), 'slots', slot_payload, 'participants', participant_payload, 'summaries', summary_payload, 'confirmedSlots', confirmed_payload, 'responses', '[]'::jsonb);
end;
$$;

create or replace function public.schedule_account_view(p_share_id text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare target_schedule public.schedules%rowtype; public_payload jsonb; own_participant public.schedule_participants%rowtype; own_responses jsonb;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    select * into target_schedule from public.schedules schedule where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now();
    if target_schedule.id is null then return null; end if;
    public_payload = public.schedule_public_view(p_share_id);
    select * into own_participant from public.schedule_participants participant where participant.schedule_id = target_schedule.id and participant.user_id = auth.uid();
    if own_participant.id is null then return public_payload; end if;
    select coalesce(jsonb_agg(jsonb_build_object('slotId', response.slot_id, 'participantId', response.participant_id, 'answer', response.answer, 'note', response.note, 'candidateRevision', response.candidate_revision, 'stale', response.candidate_revision <> slot.revision, 'ranges', coalesce((select jsonb_agg(jsonb_build_object('startMinute', range_item.start_minute, 'endMinute', range_item.end_minute, 'answer', range_item.answer, 'sortOrder', range_item.sort_order) order by range_item.sort_order) from public.schedule_response_ranges range_item where range_item.response_id = response.id), '[]'::jsonb)) order by response.updated_at), '[]'::jsonb) into own_responses from public.schedule_responses response join public.schedule_slots slot on slot.id = response.slot_id where response.schedule_id = target_schedule.id and response.participant_id = own_participant.id and slot.status = 'active';
    return public_payload || jsonb_build_object('schedule', (public_payload -> 'schedule') || case when target_schedule.owner_id = auth.uid() then jsonb_build_object('ownerId', target_schedule.owner_id) else '{}'::jsonb end, 'me', jsonb_build_object('participantId', own_participant.id, 'userId', auth.uid(), 'displayName', own_participant.display_name, 'role', own_participant.role, 'required', own_participant.required), 'responses', own_responses);
end;
$$;

create or replace function public.schedule_guest_view(p_share_id text, p_participant_id uuid, p_guest_token text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare target_schedule_id uuid; public_payload jsonb; own_payload jsonb;
begin
    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token); public_payload = public.schedule_public_view(p_share_id);
    select jsonb_build_object('participantId', participant.id, 'displayName', participant.display_name, 'responses', coalesce(jsonb_agg(jsonb_build_object('slotId', response.slot_id, 'answer', response.answer, 'note', response.note, 'candidateRevision', response.candidate_revision, 'stale', response.candidate_revision <> slot.revision, 'ranges', coalesce((select jsonb_agg(jsonb_build_object('startMinute', range_item.start_minute, 'endMinute', range_item.end_minute, 'answer', range_item.answer, 'sortOrder', range_item.sort_order) order by range_item.sort_order) from public.schedule_response_ranges range_item where range_item.response_id = response.id), '[]'::jsonb)) order by response.updated_at) filter (where response.id is not null and slot.id is not null), '[]'::jsonb)) into own_payload from public.schedule_participants participant left join public.schedule_responses response on response.participant_id = participant.id left join public.schedule_slots slot on slot.id = response.slot_id and slot.status = 'active' where participant.id = p_participant_id and participant.schedule_id = target_schedule_id group by participant.id, participant.display_name;
    return public_payload || jsonb_build_object('me', own_payload);
end;
$$;

create or replace function public.schedule_account_upsert_response(p_share_id text, p_slot_id uuid, p_answer text, p_note text default '', p_ranges jsonb default '[]'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare target_schedule public.schedules%rowtype; target_slot public.schedule_slots%rowtype; target_participant public.schedule_participants%rowtype; response_uuid uuid;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if p_answer not in ('yes', 'maybe', 'no') then raise exception 'invalid answer' using errcode = '22023'; end if;
    if jsonb_typeof(coalesce(p_ranges, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_ranges, '[]'::jsonb)) > 4 then raise exception 'invalid response ranges' using errcode = '22023'; end if;
    select * into target_schedule from public.schedules schedule where schedule.share_id = p_share_id and schedule.share_enabled = true and schedule.expires_at > now(); if target_schedule.id is null then raise exception 'schedule is not available' using errcode = '28000'; end if;
    select * into target_participant from public.schedule_participants participant where participant.schedule_id = target_schedule.id and participant.user_id = auth.uid(); if target_participant.id is null then raise exception 'participant access denied' using errcode = '28000'; end if;
    select * into target_slot from public.schedule_slots slot where slot.id = p_slot_id and slot.schedule_id = target_schedule.id and slot.status = 'active'; if target_slot.id is null then raise exception 'candidate is not available' using errcode = 'P0002'; end if;
    insert into public.schedule_responses (schedule_id, participant_id, slot_id, answer, note, candidate_revision) values (target_schedule.id, target_participant.id, p_slot_id, p_answer, left(trim(coalesce(p_note, '')), 120), target_slot.revision) on conflict (participant_id, slot_id) do update set answer = excluded.answer, note = excluded.note, candidate_revision = excluded.candidate_revision, updated_at = now() returning id into response_uuid;
    delete from public.schedule_response_ranges where response_id = response_uuid; perform public.trpg_v5_save_response_ranges(response_uuid, target_slot, p_ranges);
    return public.schedule_account_view(p_share_id);
end;
$$;

create or replace function public.schedule_guest_upsert_response(p_share_id text, p_participant_id uuid, p_guest_token text, p_slot_id uuid, p_answer text, p_note text default '', p_ranges jsonb default '[]'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare target_schedule_id uuid; target_slot public.schedule_slots%rowtype; response_uuid uuid;
begin
    if p_answer not in ('yes', 'maybe', 'no') then raise exception 'invalid answer' using errcode = '22023'; end if;
    if jsonb_typeof(coalesce(p_ranges, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_ranges, '[]'::jsonb)) > 4 then raise exception 'invalid response ranges' using errcode = '22023'; end if;
    target_schedule_id = public.schedule_assert_guest(p_share_id, p_participant_id, p_guest_token);
    select * into target_slot from public.schedule_slots slot where slot.id = p_slot_id and slot.schedule_id = target_schedule_id and slot.status = 'active'; if target_slot.id is null then raise exception 'candidate is not available' using errcode = 'P0002'; end if;
    insert into public.schedule_responses (schedule_id, participant_id, slot_id, answer, note, candidate_revision) values (target_schedule_id, p_participant_id, p_slot_id, p_answer, left(trim(coalesce(p_note, '')), 120), target_slot.revision) on conflict (participant_id, slot_id) do update set answer = excluded.answer, note = excluded.note, candidate_revision = excluded.candidate_revision, updated_at = now() returning id into response_uuid;
    delete from public.schedule_response_ranges where response_id = response_uuid; perform public.trpg_v5_save_response_ranges(response_uuid, target_slot, p_ranges);
    return public.schedule_guest_view(p_share_id, p_participant_id, p_guest_token);
end;
$$;

create or replace function public.trpg_v4_confirm_recommendation_plan(p_schedule_id uuid, p_items jsonb, p_snapshot_at timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare target_schedule public.schedules%rowtype; item jsonb; target_slot public.schedule_slots%rowtype; required_participant public.schedule_participants%rowtype; participant_response public.schedule_responses%rowtype; start_value integer; end_value integer; latest_change timestamptz; confirmed_start timestamptz; confirmed_end timestamptz; position integer := 0; seen_slots uuid[] := array[]::uuid[]; saved_items jsonb := '[]'::jsonb;
begin
    if auth.uid() is null then raise exception 'authentication required' using errcode = '28000'; end if;
    if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'plan must contain 1 to 50 items' using errcode = '22023'; end if;
    select * into target_schedule from public.schedules schedule where schedule.id = p_schedule_id and schedule.owner_id = auth.uid() for update; if target_schedule.id is null then raise exception 'owner access denied' using errcode = '28000'; end if;
    select max(change_at) into latest_change from (select slot.updated_at as change_at from public.schedule_slots slot where slot.schedule_id = p_schedule_id union all select participant.updated_at from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.role <> 'viewer' union all select response.updated_at from public.schedule_responses response join public.schedule_participants participant on participant.id = response.participant_id where response.schedule_id = p_schedule_id and participant.role <> 'viewer' union all select range_item.updated_at from public.schedule_response_ranges range_item join public.schedule_responses response on response.id = range_item.response_id join public.schedule_participants participant on participant.id = response.participant_id where response.schedule_id = p_schedule_id and participant.role <> 'viewer') changes;
    if p_snapshot_at is null or (latest_change is not null and date_trunc('milliseconds', latest_change) > date_trunc('milliseconds', p_snapshot_at)) then raise exception 'recommendation is stale; review the latest responses' using errcode = '40001'; end if;
    delete from public.schedule_confirmed_slots where schedule_id = p_schedule_id;
    for item in select value from jsonb_array_elements(p_items) loop
        target_slot.id = null; select * into target_slot from public.schedule_slots slot where slot.id = nullif(item ->> 'slotId', '')::uuid and slot.schedule_id = p_schedule_id and slot.status = 'active' for update;
        start_value = nullif(item ->> 'startMinute', '')::integer; end_value = nullif(item ->> 'endMinute', '')::integer;
        if target_slot.id is null or target_slot.id = any(seen_slots) or start_value is null or end_value is null or start_value < target_slot.start_minute or end_value > target_slot.end_minute or end_value <= start_value then raise exception 'invalid plan candidate' using errcode = '22023'; end if;
        seen_slots = array_append(seen_slots, target_slot.id); confirmed_start = (target_slot.local_date::timestamp + make_interval(mins => start_value)) at time zone target_schedule.timezone; confirmed_end = (target_slot.local_date::timestamp + make_interval(mins => end_value)) at time zone target_schedule.timezone;
        for required_participant in select * from public.schedule_participants participant where participant.schedule_id = p_schedule_id and participant.role <> 'viewer' order by participant.sort_order for update loop
            participant_response.id = null; select * into participant_response from public.schedule_responses response where response.schedule_id = p_schedule_id and response.participant_id = required_participant.id and response.slot_id = target_slot.id for update;
            if participant_response.id is null or participant_response.answer = 'no' or participant_response.candidate_revision <> target_slot.revision then raise exception 'recommendation has stale or unavailable required participants' using errcode = '40001'; end if;
            if participant_response.answer = 'maybe' and not exists (select 1 from public.schedule_response_ranges range_item where range_item.response_id = participant_response.id and range_item.start_minute <= start_value and range_item.end_minute >= end_value) then raise exception 'recommendation has uncertain required participants' using errcode = '40001'; end if;
            if required_participant.user_id is not null and exists (select 1 from public.schedule_confirmed_slots confirmed join public.schedule_participants other_participant on other_participant.schedule_id = confirmed.schedule_id and other_participant.user_id = required_participant.user_id where confirmed.schedule_id <> p_schedule_id and confirmed.status in ('held', 'confirmed') and confirmed.ends_at > confirmed_start and confirmed.starts_at < confirmed_end) then raise exception 'recommendation conflicts with another confirmed session' using errcode = '40001'; end if;
        end loop;
        insert into public.schedule_confirmed_slots (schedule_id, slot_id, sequence, status, local_date, start_minute, end_minute, starts_at, ends_at, created_by) values (p_schedule_id, target_slot.id, position, 'confirmed', target_slot.local_date, start_value, end_value, confirmed_start, confirmed_end, auth.uid()); saved_items = saved_items || jsonb_build_array(jsonb_build_object('slotId', target_slot.id, 'startMinute', start_value, 'endMinute', end_value)); position = position + 1;
    end loop;
    update public.schedules set status = 'confirmed' where id = p_schedule_id; return jsonb_build_object('scheduleId', p_schedule_id, 'items', saved_items);
end;
$$;

revoke all on function public.trpg_v5_candidate_times(public.schedules, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.trpg_v5_save_response_ranges(uuid, public.schedule_slots, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v5_update_candidate(uuid, uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.trpg_v5_bulk_update_candidate_times(uuid, uuid[], integer, integer) from public, anon, authenticated;
revoke all on function public.trpg_v5_retire_candidate(uuid, uuid) from public, anon, authenticated;
revoke all on function public.trpg_v5_restore_candidate(uuid, uuid) from public, anon, authenticated;
revoke all on function public.schedule_public_view(text) from public, anon, authenticated;
revoke all on function public.schedule_account_view(text) from public, anon, authenticated;
revoke all on function public.schedule_guest_view(text, uuid, text) from public, anon, authenticated;
revoke all on function public.schedule_account_upsert_response(text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.schedule_guest_upsert_response(text, uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.trpg_v4_confirm_recommendation_plan(uuid, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.trpg_v5_update_candidate(uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.trpg_v5_bulk_update_candidate_times(uuid, uuid[], integer, integer) to authenticated;
grant execute on function public.trpg_v5_retire_candidate(uuid, uuid) to authenticated;
grant execute on function public.trpg_v5_restore_candidate(uuid, uuid) to authenticated;
grant execute on function public.schedule_public_view(text) to anon, authenticated;
grant execute on function public.schedule_account_view(text) to authenticated;
grant execute on function public.schedule_guest_view(text, uuid, text) to anon, authenticated;
grant execute on function public.schedule_account_upsert_response(text, uuid, text, text, jsonb) to authenticated;
grant execute on function public.schedule_guest_upsert_response(text, uuid, text, uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.trpg_v4_confirm_recommendation_plan(uuid, jsonb, timestamptz) to authenticated;
