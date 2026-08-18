begin;

create temp table schedule_security_results (
    name text primary key,
    passed boolean not null,
    detail text not null default ''
) on commit drop;

grant select, insert on schedule_security_results to anon, authenticated;

create or replace function pg_temp.pass(test_name text, detail text default '')
returns void
language plpgsql
as $$
begin
    insert into schedule_security_results(name, passed, detail)
    values (test_name, true, detail);
end;
$$;

create or replace function pg_temp.fail(test_name text, detail text)
returns void
language plpgsql
as $$
begin
    insert into schedule_security_results(name, passed, detail)
    values (test_name, false, detail);
end;
$$;

create or replace function pg_temp.expect_error(test_name text, sql_text text)
returns void
language plpgsql
as $$
begin
    execute sql_text;
    perform pg_temp.fail(test_name, 'expected an error but the statement succeeded');
exception
    when others then
        perform pg_temp.pass(test_name, sqlstate || ': ' || sqlerrm);
end;
$$;

create or replace function pg_temp.set_auth(user_uuid uuid)
returns void
language plpgsql
as $$
begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', user_uuid::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

create or replace function pg_temp.set_anon()
returns void
language plpgsql
as $$
begin
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', 'anon', true);
end;
$$;

select set_config('role', 'postgres', true);

do $$
declare
    owner_a uuid := '10000000-0000-4000-8000-000000000001';
    owner_b uuid := '10000000-0000-4000-8000-000000000002';
    schedule_a uuid;
    schedule_b uuid;
    share_a text;
    share_b text;
    slot_a uuid;
    slot_b uuid;
    owner_participant_a uuid;
    guest_a jsonb;
    guest_b jsonb;
    guest_a_id uuid;
    guest_b_id uuid;
    guest_a_token text;
    guest_b_token text;
    response_a uuid;
    confirm_result jsonb;
    disabled_share text;
    expired_share text;
    fn_without_search_path integer;
begin
    insert into auth.users (
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data
    )
    values
        (owner_a, 'authenticated', 'authenticated', 'schedule-owner-a@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
        (owner_b, 'authenticated', 'authenticated', 'schedule-owner-b@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
    on conflict (id) do nothing;

    perform pg_temp.set_auth(owner_a);

    insert into public.schedules(owner_id, title, timezone)
    values (owner_a, 'Owner A Schedule', 'Asia/Tokyo')
    returning id, share_id into schedule_a, share_a;

    insert into public.schedule_slots(schedule_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order)
    values (schedule_a, '2026-08-24', 1140, 1440, '2026-08-24T10:00:00Z', '2026-08-24T15:00:00Z', 0)
    returning id into slot_a;

    insert into public.schedule_participants(schedule_id, user_id, display_name, role, required, sort_order)
    values (schedule_a, owner_a, 'Owner A', 'owner', true, 0)
    returning id into owner_participant_a;

    insert into public.schedule_responses(schedule_id, participant_id, slot_id, answer)
    values (schedule_a, owner_participant_a, slot_a, 'yes')
    returning id into response_a;

    insert into public.schedule_response_ranges(response_id, start_minute, end_minute, sort_order)
    values (response_a, 1200, 1380, 0);

    perform pg_temp.pass('owner a create');

    perform pg_temp.set_auth(owner_b);

    insert into public.schedules(owner_id, title, timezone)
    values (owner_b, 'Owner B Schedule', 'Asia/Tokyo')
    returning id, share_id into schedule_b, share_b;

    insert into public.schedule_slots(schedule_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order)
    values (schedule_b, '2026-08-25', 1140, 1440, '2026-08-25T10:00:00Z', '2026-08-25T15:00:00Z', 0)
    returning id into slot_b;

    if exists (select 1 from public.schedules where id = schedule_a) then
        perform pg_temp.fail('owner a schedule hidden from owner b', 'owner b could read owner a schedule');
    else
        perform pg_temp.pass('owner a schedule hidden from owner b');
    end if;

    update public.schedules
    set title = 'tampered'
    where id = schedule_a;

    perform set_config('role', 'postgres', true);

    if exists (
        select 1
        from public.schedules
        where id = schedule_a
          and title = 'tampered'
    ) then
        perform pg_temp.fail('owner b cannot update owner a schedule', 'title changed');
    else
        perform pg_temp.pass('owner b cannot update owner a schedule', '0 visible rows updated by RLS');
    end if;

    perform pg_temp.set_anon();

    perform pg_temp.expect_error('anon direct schedules select denied', 'select count(*) from public.schedules');
    perform pg_temp.expect_error('anon direct schedules insert denied', 'insert into public.schedules(owner_id, title) values (''10000000-0000-4000-8000-000000000001'', ''bad'')');
    perform pg_temp.expect_error('guest credentials direct select denied', 'select count(*) from public.schedule_guest_credentials');

    if public.schedule_public_view(share_a) is null then
        perform pg_temp.fail('anon public view allowed by share id', 'public view returned null');
    else
        perform pg_temp.pass('anon public view allowed by share id');
    end if;

    guest_a = public.schedule_guest_join(share_a, 'Guest A');
    guest_b = public.schedule_guest_join(share_a, 'Guest B');
    guest_a_id = (guest_a ->> 'participantId')::uuid;
    guest_b_id = (guest_b ->> 'participantId')::uuid;
    guest_a_token = guest_a ->> 'guestToken';
    guest_b_token = guest_b ->> 'guestToken';

    perform public.schedule_guest_upsert_response(
        share_a,
        guest_a_id,
        guest_a_token,
        slot_a,
        'maybe',
        'late',
        '[{"startMinute":1200,"endMinute":1380}]'::jsonb
    );
    perform pg_temp.pass('guest a own response update allowed');

    perform pg_temp.expect_error(
        'guest a cannot overwrite guest b response',
        format(
            'select public.schedule_guest_upsert_response(%L, %L, %L, %L, %L, %L, %L::jsonb)',
            share_a,
            guest_b_id,
            guest_a_token,
            slot_a,
            'yes',
            '',
            '[]'
        )
    );

    perform pg_temp.expect_error(
        'participant id alone cannot impersonate guest',
        format('select public.schedule_guest_view(%L, %L, %L)', share_a, guest_a_id, 'x')
    );

    perform pg_temp.expect_error(
        'invalid guest token denied',
        format('select public.schedule_guest_view(%L, %L, %L)', share_a, guest_a_id, repeat('x', 44))
    );

    perform pg_temp.expect_error(
        'guessed share id denied',
        format('select public.schedule_guest_join(%L, %L)', repeat('a', 44), 'Bad Guest')
    );

    perform pg_temp.expect_error(
        'guest cannot use another schedule slot',
        format(
            'select public.schedule_guest_upsert_response(%L, %L, %L, %L, %L, %L, %L::jsonb)',
            share_a,
            guest_a_id,
            guest_a_token,
            slot_b,
            'yes',
            '',
            '[]'
        )
    );

    perform pg_temp.expect_error(
        'malformed ranges denied',
        format(
            'select public.schedule_guest_upsert_response(%L, %L, %L, %L, %L, %L, %L::jsonb)',
            share_a,
            guest_a_id,
            guest_a_token,
            slot_a,
            'yes',
            '',
            '[{"startMinute":1380,"endMinute":1200}]'
        )
    );

    perform pg_temp.expect_error(
        'overlapping ranges denied',
        format(
            'select public.schedule_guest_upsert_response(%L, %L, %L, %L, %L, %L, %L::jsonb)',
            share_a,
            guest_a_id,
            guest_a_token,
            slot_a,
            'maybe',
            '',
            '[{"startMinute":1200,"endMinute":1320},{"startMinute":1260,"endMinute":1380}]'
        )
    );

    perform pg_temp.expect_error(
        'invalid answer denied',
        format(
            'select public.schedule_guest_upsert_response(%L, %L, %L, %L, %L, %L, %L::jsonb)',
            share_a,
            guest_a_id,
            guest_a_token,
            slot_a,
            'ok',
            '',
            '[]'
        )
    );

    perform set_config('role', 'postgres', true);

    insert into public.schedules(owner_id, title, timezone, share_enabled)
    values (owner_a, 'Disabled Schedule', 'Asia/Tokyo', false)
    returning share_id into disabled_share;

    insert into public.schedules(owner_id, title, timezone, status)
    values (owner_a, 'Expired Schedule', 'Asia/Tokyo', 'expired')
    returning share_id into expired_share;

    perform pg_temp.set_anon();

    perform pg_temp.expect_error(
        'disabled share guest join denied',
        format('select public.schedule_guest_join(%L, %L)', disabled_share, 'Nope')
    );

    perform pg_temp.expect_error(
        'expired schedule guest join denied',
        format('select public.schedule_guest_join(%L, %L)', expired_share, 'Nope')
    );

    perform set_config('role', 'postgres', true);

    update public.schedules
    set max_participants = (
        select count(*)
        from public.schedule_participants participant
        where participant.schedule_id = schedule_a
    )
    where id = schedule_a;

    perform pg_temp.set_anon();

    perform pg_temp.expect_error(
        'participant limit enforced in rpc',
        format('select public.schedule_guest_join(%L, %L)', share_a, 'Too Many')
    );

    perform pg_temp.set_auth(owner_a);

    confirm_result = public.schedule_owner_confirm_slots(
        schedule_a,
        jsonb_build_array(jsonb_build_object('slotId', slot_a, 'status', 'held'))
    );

    if coalesce((confirm_result ->> 'confirmedCount')::integer, 0) = 1 then
        perform pg_temp.pass('owner hold confirm rpc allowed');
    else
        perform pg_temp.fail('owner hold confirm rpc allowed', confirm_result::text);
    end if;

    perform pg_temp.expect_error(
        'owner cannot confirm another owner schedule',
        format(
            'select public.schedule_owner_confirm_slots(%L, %L::jsonb)',
            schedule_b,
            jsonb_build_array(jsonb_build_object('slotId', slot_b, 'status', 'confirmed'))::text
        )
    );

    select count(*)
    into fn_without_search_path
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname like 'schedule_%'
      and proc.prosecdef
      and not exists (
          select 1
          from unnest(coalesce(proc.proconfig, array[]::text[])) setting
          where setting like 'search_path=%'
      );

    if fn_without_search_path = 0 then
        perform pg_temp.pass('security definer functions have fixed search_path');
    else
        perform pg_temp.fail('security definer functions have fixed search_path', fn_without_search_path::text);
    end if;
end;
$$;

select name, passed, detail
from schedule_security_results
order by name;

do $$
declare
    failed_count integer;
    failed_names text;
begin
    select count(*)
    into failed_count
    from schedule_security_results
    where not passed;

    select string_agg(name || ': ' || detail, '; ' order by name)
    into failed_names
    from schedule_security_results
    where not passed;

    if failed_count > 0 then
        raise exception 'schedule db security test failed: %: %', failed_count, failed_names;
    end if;
end;
$$;

rollback;
