-- RELMUA TRPG v2 vertical slice support.
-- Extends Schedule DB v1 instead of creating parallel session tables.

alter table public.profiles
    add column if not exists avatar_url text,
    add column if not exists discord_user_id text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_avatar_url_length'
    ) then
        alter table public.profiles
            add constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 500);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_discord_user_id_length'
    ) then
        alter table public.profiles
            add constraint profiles_discord_user_id_length check (discord_user_id is null or char_length(discord_user_id) between 1 and 80);
    end if;
end $$;

create unique index if not exists profiles_discord_user_id_unique
on public.profiles(discord_user_id)
where discord_user_id is not null;

alter table public.schedules
    add column if not exists created_by uuid references auth.users(id) on delete restrict;

update public.schedules
set created_by = owner_id
where created_by is null;

alter table public.schedules
    alter column created_by set default auth.uid(),
    alter column created_by set not null;

create index if not exists schedules_created_by_idx on public.schedules(created_by);

create or replace function public.trpg_v2_auth_profile()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
    select coalesce(jsonb_build_object(
        'displayName', coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'global_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'user_name', ''),
            nullif(auth_user.raw_user_meta_data ->> 'preferred_username', ''),
            'RELMUA User'
        ),
        'avatarUrl', coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
            nullif(auth_user.raw_user_meta_data ->> 'picture', '')
        ),
        'discordUserId', coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'provider_id', ''),
            nullif(auth_user.raw_user_meta_data ->> 'sub', '')
        )
    ), '{}'::jsonb)
    from auth.users auth_user
    where auth_user.id = auth.uid();
$$;

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

    insert into public.profiles (
        id,
        display_name,
        avatar_url,
        discord_user_id
    )
    values (
        auth.uid(),
        profile_name,
        profile_avatar,
        profile_discord_id
    )
    on conflict (id)
    do update set
        display_name = excluded.display_name,
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

create or replace function public.trpg_v2_create_session(
    p_title text,
    p_total_minutes integer default 240,
    p_memo text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    profile_payload jsonb;
    profile_name text;
    new_schedule public.schedules%rowtype;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    p_title = trim(coalesce(p_title, ''));
    p_memo = left(trim(coalesce(p_memo, '')), 2000);
    p_total_minutes = greatest(0, least(coalesce(p_total_minutes, 240), 1800));

    if char_length(p_title) < 1 or char_length(p_title) > 120 then
        raise exception 'title must be 1 to 120 characters' using errcode = '22023';
    end if;

    profile_payload = public.trpg_v2_upsert_profile_from_auth();
    profile_name = left(trim(coalesce(profile_payload ->> 'displayName', 'RELMUA User')), 80);

    insert into public.schedules (
        owner_id,
        created_by,
        title,
        description,
        timezone,
        status,
        total_minutes,
        session_minutes,
        max_participants,
        schema_version
    )
    values (
        auth.uid(),
        auth.uid(),
        p_title,
        p_memo,
        'Asia/Tokyo',
        'collecting',
        p_total_minutes,
        180,
        50,
        1
    )
    returning * into new_schedule;

    insert into public.schedule_participants (
        schedule_id,
        user_id,
        display_name,
        role,
        required,
        sort_order
    )
    values (
        new_schedule.id,
        auth.uid(),
        profile_name,
        'owner',
        true,
        0
    );

    return public.schedule_account_view(new_schedule.share_id);
end;
$$;

create or replace function public.trpg_v2_add_candidate(
    p_schedule_id uuid,
    p_starts_at timestamptz,
    p_ends_at timestamptz,
    p_label text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    local_start timestamp;
    local_end timestamp;
    start_of_day timestamp;
    next_order integer;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
        raise exception 'invalid candidate time' using errcode = '22023';
    end if;

    select *
    into target_schedule
    from public.schedules schedule
    where schedule.id = p_schedule_id
      and schedule.owner_id = auth.uid();

    if target_schedule.id is null then
        raise exception 'owner access denied' using errcode = '28000';
    end if;

    local_start = p_starts_at at time zone target_schedule.timezone;
    local_end = p_ends_at at time zone target_schedule.timezone;
    start_of_day = date_trunc('day', local_start);

    if local_end <= local_start then
        raise exception 'invalid local candidate time' using errcode = '22023';
    end if;

    select coalesce(max(slot.sort_order), -1) + 1
    into next_order
    from public.schedule_slots slot
    where slot.schedule_id = p_schedule_id;

    insert into public.schedule_slots (
        schedule_id,
        local_date,
        start_minute,
        end_minute,
        starts_at,
        ends_at,
        sort_order,
        label
    )
    values (
        p_schedule_id,
        local_start::date,
        floor(extract(epoch from (local_start - start_of_day)) / 60)::integer,
        floor(extract(epoch from (local_end - start_of_day)) / 60)::integer,
        p_starts_at,
        p_ends_at,
        next_order,
        left(trim(coalesce(p_label, '')), 120)
    );

    update public.schedules
    set status = 'collecting'
    where id = p_schedule_id
      and status in ('draft', 'ready');

    return public.schedule_account_view(target_schedule.share_id);
end;
$$;

create or replace function public.trpg_v2_transfer_kp(
    p_schedule_id uuid,
    p_new_owner_user_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
    target_schedule public.schedules%rowtype;
    target_participant public.schedule_participants%rowtype;
    old_owner_participant public.schedule_participants%rowtype;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;

    if p_new_owner_user_id is null then
        raise exception 'new owner must be an account participant' using errcode = '22023';
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
    into target_participant
    from public.schedule_participants participant
    where participant.schedule_id = p_schedule_id
      and participant.user_id = p_new_owner_user_id
    for update;

    if target_participant.id is null then
        raise exception 'new owner must be a logged-in participant' using errcode = '22023';
    end if;

    select *
    into old_owner_participant
    from public.schedule_participants participant
    where participant.schedule_id = p_schedule_id
      and participant.user_id = auth.uid()
    for update;

    update public.schedules
    set owner_id = p_new_owner_user_id
    where id = p_schedule_id;

    if old_owner_participant.id is not null and old_owner_participant.id <> target_participant.id then
        update public.schedule_participants
        set role = 'participant',
            required = false
        where id = old_owner_participant.id;
    end if;

    update public.schedule_participants
    set role = 'owner',
        required = true
    where id = target_participant.id;

    return public.schedule_account_view(target_schedule.share_id);
end;
$$;

revoke all on function public.trpg_v2_auth_profile() from public, anon, authenticated;
revoke all on function public.trpg_v2_upsert_profile_from_auth() from public, anon, authenticated;
revoke all on function public.trpg_v2_create_session(text, integer, text) from public, anon, authenticated;
revoke all on function public.trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.trpg_v2_transfer_kp(uuid, uuid) from public, anon, authenticated;

grant execute on function public.trpg_v2_upsert_profile_from_auth() to authenticated;
grant execute on function public.trpg_v2_create_session(text, integer, text) to authenticated;
grant execute on function public.trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.trpg_v2_transfer_kp(uuid, uuid) to authenticated;
