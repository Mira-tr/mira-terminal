-- Production verification for RELMUA Schedule account participants.
-- Run through `supabase db query --linked --file ...`.
-- The transaction rolls back, so no test schedules or auth users remain.

begin;

create temporary table verification_guest_credentials (
    participant_id uuid not null,
    guest_token text not null
) on commit drop;

grant select, insert, update, delete on verification_guest_credentials to anon, authenticated;

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
        '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'relmua-owner-a@example.invalid',
        '',
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-0000000000a2',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'relmua-owner-b@example.invalid',
        '',
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-0000000000b1',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'relmua-pl-b@example.invalid',
        '',
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
    )
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

insert into public.schedules (
    id,
    owner_id,
    share_id,
    title,
    status,
    max_participants
)
values (
    '00000000-0000-0000-0000-0000000000c1',
    '00000000-0000-0000-0000-0000000000a1',
    'test_share_account_participant_20260818133000',
    '__relmua_account_participant_verification__',
    'collecting',
    50
);

insert into public.schedule_slots (
    id,
    schedule_id,
    local_date,
    start_minute,
    end_minute,
    starts_at,
    ends_at,
    sort_order
)
values (
    '00000000-0000-0000-0000-0000000000d1',
    '00000000-0000-0000-0000-0000000000c1',
    date '2026-08-24',
    1260,
    1500,
    timestamptz '2026-08-24 21:00:00+09',
    timestamptz '2026-08-25 01:00:00+09',
    0
);

insert into public.schedule_participants (
    id,
    schedule_id,
    user_id,
    display_name,
    role,
    required,
    sort_order
)
values (
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000c1',
    '00000000-0000-0000-0000-0000000000a1',
    'Owner A',
    'owner',
    true,
    0
);

reset role;

set local role anon;
insert into verification_guest_credentials (participant_id, guest_token)
select
    (payload ->> 'participantId')::uuid,
    payload ->> 'guestToken'
from (
    select public.schedule_guest_join(
        'test_share_account_participant_20260818133000',
        'Guest A'
    ) as payload
) joined;
reset role;

set local role anon;
select public.schedule_guest_upsert_response(
    'test_share_account_participant_20260818133000',
    (select participant_id from verification_guest_credentials limit 1),
    (select guest_token from verification_guest_credentials limit 1),
    '00000000-0000-0000-0000-0000000000d1',
    'yes',
    '',
    '[{"startMinute":1260,"endMinute":1380}]'::jsonb
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select public.schedule_account_join(
    'test_share_account_participant_20260818133000',
    'Account PL'
) as account_join_view;
select public.schedule_account_upsert_response(
    'test_share_account_participant_20260818133000',
    '00000000-0000-0000-0000-0000000000d1',
    'maybe',
    '',
    '[{"startMinute":1320,"endMinute":1440}]'::jsonb
) as account_response_view;
reset role;

set local role anon;
do $$
begin
    begin
        insert into public.schedule_responses (
            schedule_id,
            participant_id,
            slot_id,
            answer
        )
        values (
            '00000000-0000-0000-0000-0000000000c1',
            '00000000-0000-0000-0000-0000000000e1',
            '00000000-0000-0000-0000-0000000000d1',
            'yes'
        );
        raise exception 'anon direct table write unexpectedly succeeded';
    exception
        when insufficient_privilege then null;
    end;

    begin
        perform 1 from public.schedule_guest_credentials limit 1;
        raise exception 'anon credential select unexpectedly succeeded';
    exception
        when insufficient_privilege then null;
    end;
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$
begin
    begin
        update public.schedules
        set title = 'Owner B overwrite'
        where id = '00000000-0000-0000-0000-0000000000c1';

        if found then
            raise exception 'Owner B updated Owner A schedule';
        end if;
    end;
end;
$$;
reset role;

set local role anon;
do $$
declare
    guest_participant_id uuid;
    v_guest_token text;
begin
    select stored.participant_id, stored.guest_token
    into guest_participant_id, v_guest_token
    from verification_guest_credentials stored
    limit 1;

    begin
        perform public.schedule_guest_upsert_response(
            'test_share_account_participant_20260818133000',
            guest_participant_id,
            'invalid-token',
            '00000000-0000-0000-0000-0000000000d1',
            'no',
            '',
            '[]'::jsonb
        );
        raise exception 'invalid guest token unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;

    begin
        perform public.schedule_guest_upsert_response(
            'test_share_account_participant_20260818133000',
            '00000000-0000-0000-0000-0000000000e1',
            v_guest_token,
            '00000000-0000-0000-0000-0000000000d1',
            'no',
            '',
            '[]'::jsonb
        );
        raise exception 'participant_id-only impersonation unexpectedly succeeded';
    exception
        when invalid_authorization_specification then null;
    end;
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
update public.schedules
set share_enabled = false
where id = '00000000-0000-0000-0000-0000000000c1';
reset role;

set local role anon;
do $$
begin
    begin
        perform public.schedule_guest_join(
            'test_share_account_participant_20260818133000',
            'Blocked Guest'
        );
        raise exception 'disabled share unexpectedly allowed guest join';
    exception
        when invalid_authorization_specification or no_data_found then null;
    end;
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
update public.schedules
set share_enabled = true
where id = '00000000-0000-0000-0000-0000000000c1';
reset role;

alter table public.schedules disable trigger schedules_set_root_timestamps;
update public.schedules
set expires_at = now() - interval '1 day',
    last_activity_at = now() - interval '366 days'
where id = '00000000-0000-0000-0000-0000000000c1';
alter table public.schedules enable trigger schedules_set_root_timestamps;

set local role anon;
do $$
begin
    begin
        perform public.schedule_guest_join(
            'test_share_account_participant_20260818133000',
            'Expired Guest'
        );
        raise exception 'expired schedule unexpectedly allowed guest join';
    exception
        when invalid_authorization_specification or no_data_found then null;
    end;
end;
$$;
reset role;

select
    has_table_privilege('anon', 'public.schedules', 'insert') as anon_schedule_insert,
    has_table_privilege('anon', 'public.schedule_guest_credentials', 'select') as anon_credentials_select,
    has_function_privilege('anon', 'public.schedule_account_join(text,text)', 'execute') as anon_account_join_execute,
    has_function_privilege('authenticated', 'public.schedule_account_join(text,text)', 'execute') as auth_account_join_execute;

rollback;
