-- Staging verification for RELMUA TRPG v2 vertical slice.
-- Run through `supabase db query --linked --file ...` after applying
-- supabase/migrations/20260822170000_trpg_v2_vertical_slice.sql.
-- The transaction rolls back, so no test schedules or auth users remain.

begin;

create temporary table trpg_v2_state (
    key text primary key,
    value text not null
) on commit drop;

create temporary table trpg_v2_guest_credentials (
    participant_id uuid not null,
    guest_token text not null
) on commit drop;

grant select, insert, update, delete on trpg_v2_state to anon, authenticated;
grant select, insert, update, delete on trpg_v2_guest_credentials to anon, authenticated;

insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
values
    (
        '00000000-0000-0000-0000-000000000a11',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'trpg-v2-user-a@example.invalid',
        '',
        now(),
        '{"provider":"discord","providers":["discord"]}'::jsonb,
        '{"provider_id":"discord-v2-user-a","global_name":"TRPG User A","avatar_url":"https://cdn.discordapp.com/avatars/a.png"}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000b11',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'trpg-v2-user-b@example.invalid',
        '',
        now(),
        '{"provider":"discord","providers":["discord"]}'::jsonb,
        '{"provider_id":"discord-v2-user-b","global_name":"TRPG User B","avatar_url":"https://cdn.discordapp.com/avatars/b.png"}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000c11',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'trpg-v2-stranger@example.invalid',
        '',
        now(),
        '{"provider":"discord","providers":["discord"]}'::jsonb,
        '{"provider_id":"discord-v2-stranger","global_name":"TRPG Stranger"}'::jsonb,
        now(),
        now()
    )
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000a11';

insert into trpg_v2_state(key, value)
select 'user_a_profile', public.trpg_v2_upsert_profile_from_auth()::text;

insert into trpg_v2_state(key, value)
select 'created_view', public.trpg_v2_create_session(
    '__relmua_trpg_v2_vertical_slice__',
    240,
    'rollback verification'
)::text;

insert into trpg_v2_state(key, value)
select 'schedule_id', value::jsonb #>> '{schedule,id}'
from trpg_v2_state
where key = 'created_view';

insert into trpg_v2_state(key, value)
select 'share_id', value::jsonb #>> '{schedule,shareId}'
from trpg_v2_state
where key = 'created_view';

insert into trpg_v2_state(key, value)
select 'owner_participant_id', value::jsonb #>> '{me,participantId}'
from trpg_v2_state
where key = 'created_view';

insert into trpg_v2_state(key, value)
select 'candidate_view', public.trpg_v2_add_candidate(
    (select value::uuid from trpg_v2_state where key = 'schedule_id'),
    timestamptz '2026-08-24 21:00:00+09',
    timestamptz '2026-08-25 01:00:00+09',
    '夜卓'
)::text;

insert into trpg_v2_state(key, value)
select 'slot_id', value::jsonb #>> '{slots,0,id}'
from trpg_v2_state
where key = 'candidate_view';

do $$
declare
    schedule_uuid uuid = (select value::uuid from trpg_v2_state where key = 'schedule_id');
    slot_uuid uuid = (select value::uuid from trpg_v2_state where key = 'slot_id');
begin
    if not exists (
        select 1
        from public.schedules schedule
        where schedule.id = schedule_uuid
          and schedule.created_by = '00000000-0000-0000-0000-000000000a11'
          and schedule.owner_id = '00000000-0000-0000-0000-000000000a11'
    ) then
        raise exception 'created_by / owner_id mismatch';
    end if;

    if not exists (
        select 1
        from public.schedule_participants participant
        where participant.schedule_id = schedule_uuid
          and participant.user_id = '00000000-0000-0000-0000-000000000a11'
          and participant.role = 'owner'
    ) then
        raise exception 'creator was not inserted as KP';
    end if;

    if not exists (
        select 1
        from public.schedule_slots slot
        where slot.id = slot_uuid
          and slot.schedule_id = schedule_uuid
          and slot.local_date = date '2026-08-24'
          and slot.start_minute = 1260
          and slot.end_minute = 1500
    ) then
        raise exception 'candidate was not stored with Japan-time minutes';
    end if;
end;
$$;

select public.schedule_account_upsert_response(
    (select value from trpg_v2_state where key = 'share_id'),
    (select value::uuid from trpg_v2_state where key = 'slot_id'),
    'yes',
    '',
    '[]'::jsonb
) as user_a_answer;

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000b11';

insert into trpg_v2_state(key, value)
select 'user_b_profile', public.trpg_v2_upsert_profile_from_auth()::text;

select public.schedule_account_join(
    (select value from trpg_v2_state where key = 'share_id'),
    'TRPG User B'
) as user_b_join;

select public.schedule_account_upsert_response(
    (select value from trpg_v2_state where key = 'share_id'),
    (select value::uuid from trpg_v2_state where key = 'slot_id'),
    'maybe',
    '',
    '[]'::jsonb
) as user_b_answer;

do $$
begin
    begin
        perform public.trpg_v2_add_candidate(
            (select value::uuid from trpg_v2_state where key = 'schedule_id'),
            timestamptz '2026-08-26 21:00:00+09',
            timestamptz '2026-08-27 01:00:00+09',
            'PL denied'
        );
        raise exception 'PL candidate creation unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;

    begin
        perform public.schedule_owner_confirm_slots(
            (select value::uuid from trpg_v2_state where key = 'schedule_id'),
            jsonb_build_array(jsonb_build_object(
                'slotId', (select value from trpg_v2_state where key = 'slot_id'),
                'status', 'confirmed'
            ))
        );
        raise exception 'PL confirmation unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;

    begin
        perform public.trpg_v2_transfer_kp(
            (select value::uuid from trpg_v2_state where key = 'schedule_id'),
            '00000000-0000-0000-0000-000000000a11'
        );
        raise exception 'PL KP transfer unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;
end;
$$;

reset role;

set local role anon;

insert into trpg_v2_guest_credentials(participant_id, guest_token)
select
    (payload ->> 'participantId')::uuid,
    payload ->> 'guestToken'
from (
    select public.schedule_guest_join(
        (select value from trpg_v2_state where key = 'share_id'),
        'Guest C'
    ) as payload
) joined;

select public.schedule_guest_upsert_response(
    (select value from trpg_v2_state where key = 'share_id'),
    (select participant_id from trpg_v2_guest_credentials limit 1),
    (select guest_token from trpg_v2_guest_credentials limit 1),
    (select value::uuid from trpg_v2_state where key = 'slot_id'),
    'no',
    '',
    '[]'::jsonb
) as guest_answer;

do $$
begin
    begin
        perform public.schedule_guest_upsert_response(
            (select value from trpg_v2_state where key = 'share_id'),
            (select value::uuid from trpg_v2_state where key = 'owner_participant_id'),
            (select guest_token from trpg_v2_guest_credentials limit 1),
            (select value::uuid from trpg_v2_state where key = 'slot_id'),
            'no',
            '',
            '[]'::jsonb
        );
        raise exception 'guest participant impersonation unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;

    begin
        perform public.trpg_v2_create_session('Anon denied', 180, '');
        raise exception 'anon v2 session creation unexpectedly succeeded';
    exception
        when invalid_authorization_specification or insufficient_privilege then null;
    end;
end;
$$;

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000c11';

do $$
begin
    begin
        update public.schedules
        set title = 'Stranger overwrite'
        where id = (select value::uuid from trpg_v2_state where key = 'schedule_id');

        if found then
            raise exception 'non-member updated schedule';
        end if;
    end;

    if exists (
        select 1
        from public.schedules
        where id = (select value::uuid from trpg_v2_state where key = 'schedule_id')
    ) then
        raise exception 'non-member read private schedule';
    end if;
end;
$$;

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000a11';

select public.schedule_owner_confirm_slots(
    (select value::uuid from trpg_v2_state where key = 'schedule_id'),
    jsonb_build_array(jsonb_build_object(
        'slotId', (select value from trpg_v2_state where key = 'slot_id'),
        'status', 'confirmed'
    ))
) as user_a_confirm;

do $$
begin
    begin
        perform public.trpg_v2_transfer_kp(
            (select value::uuid from trpg_v2_state where key = 'schedule_id'),
            null
        );
        raise exception 'transfer to guest/null unexpectedly succeeded';
    exception
        when invalid_parameter_value then null;
    end;
end;
$$;

select public.trpg_v2_transfer_kp(
    (select value::uuid from trpg_v2_state where key = 'schedule_id'),
    '00000000-0000-0000-0000-000000000b11'
) as transfer_to_user_b;

do $$
begin
    if not exists (
        select 1
        from public.schedules schedule
        where schedule.id = (select value::uuid from trpg_v2_state where key = 'schedule_id')
          and schedule.owner_id = '00000000-0000-0000-0000-000000000b11'
    ) then
        raise exception 'new KP was not stored as owner_id';
    end if;

    if (
        select count(*)
        from public.schedule_participants participant
        where participant.schedule_id = (select value::uuid from trpg_v2_state where key = 'schedule_id')
          and participant.role = 'owner'
    ) <> 1 then
        raise exception 'KP count is not exactly one after transfer';
    end if;

    begin
        perform public.trpg_v2_add_candidate(
            (select value::uuid from trpg_v2_state where key = 'schedule_id'),
            timestamptz '2026-08-28 21:00:00+09',
            timestamptz '2026-08-29 01:00:00+09',
            'former KP denied'
        );
        raise exception 'former KP management unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;
end;
$$;

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000b11';

select public.trpg_v2_add_candidate(
    (select value::uuid from trpg_v2_state where key = 'schedule_id'),
    timestamptz '2026-08-28 21:00:00+09',
    timestamptz '2026-08-29 01:00:00+09',
    'new KP allowed'
) as new_kp_candidate;

select
    has_column_privilege('authenticated', 'public.profiles', 'discord_user_id', 'select') as auth_profile_discord_select,
    has_table_privilege('anon', 'public.schedule_guest_credentials', 'select') as anon_credentials_select,
    has_function_privilege('anon', 'public.trpg_v2_create_session(text,integer,text)', 'execute') as anon_create_session_execute,
    has_function_privilege('authenticated', 'public.trpg_v2_create_session(text,integer,text)', 'execute') as auth_create_session_execute,
    has_function_privilege('authenticated', 'public.trpg_v2_transfer_kp(uuid,uuid)', 'execute') as auth_transfer_kp_execute;

rollback;
