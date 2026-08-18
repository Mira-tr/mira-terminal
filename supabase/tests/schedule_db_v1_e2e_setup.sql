select set_config('role', 'postgres', true);

do $$
declare
    owner_uuid uuid := '20000000-0000-4000-8000-000000000001';
    schedule_id uuid;
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
    values (
        owner_uuid,
        'authenticated',
        'authenticated',
        'schedule-e2e-owner@example.invalid',
        '',
        now(),
        now(),
        now(),
        '{}'::jsonb,
        '{}'::jsonb
    )
    on conflict (id) do nothing;

    delete from public.schedules
    where owner_id = owner_uuid
      and title like 'RELMUA E2E %';

    insert into public.schedules(owner_id, title, description, timezone, total_minutes, session_minutes)
    values (
        owner_uuid,
        'RELMUA E2E Schedule DB v1',
        'Guest browser E2E target',
        'Asia/Tokyo',
        360,
        180
    )
    returning id into schedule_id;

    insert into public.schedule_slots(schedule_id, local_date, start_minute, end_minute, starts_at, ends_at, sort_order)
    values
        (schedule_id, '2026-08-24', 1140, 1440, '2026-08-24T10:00:00Z', '2026-08-24T15:00:00Z', 0),
        (schedule_id, '2026-08-25', 1200, 1440, '2026-08-25T11:00:00Z', '2026-08-25T15:00:00Z', 1),
        (schedule_id, '2026-08-26', 1260, 1500, '2026-08-26T12:00:00Z', '2026-08-26T16:00:00Z', 2);

    insert into public.schedule_participants(schedule_id, user_id, display_name, role, required, sort_order)
    values (schedule_id, owner_uuid, 'Owner E2E', 'owner', true, 0);
end;
$$;

select jsonb_build_object(
    'scheduleId', schedule.id,
    'shareId', schedule.share_id,
    'slotIds', (
        select jsonb_agg(slot.id order by slot.sort_order)
        from public.schedule_slots slot
        where slot.schedule_id = schedule.id
    )
) as e2e
from public.schedules schedule
where title = 'RELMUA E2E Schedule DB v1'
limit 1;
