-- RELMUA Schedule DB v1 policy recursion fix.
-- Use SECURITY DEFINER helper predicates in RLS policies so schedule,
-- participant, response, and range policies do not recursively query each other.

create or replace function public.schedule_is_owner(target_schedule_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.schedules schedule
        where schedule.id = target_schedule_id
          and schedule.owner_id = auth.uid()
    );
$$;

create or replace function public.schedule_is_auth_participant(target_schedule_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.schedule_participants participant
        where participant.schedule_id = target_schedule_id
          and participant.user_id = auth.uid()
    );
$$;

create or replace function public.schedule_response_is_auth_participant(
    target_schedule_id uuid,
    target_participant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.schedule_participants participant
        where participant.schedule_id = target_schedule_id
          and participant.id = target_participant_id
          and participant.user_id = auth.uid()
    );
$$;

drop policy if exists schedules_owner_all on public.schedules;
drop policy if exists schedules_auth_participant_select on public.schedules;
drop policy if exists schedule_slots_owner_all on public.schedule_slots;
drop policy if exists schedule_slots_auth_participant_select on public.schedule_slots;
drop policy if exists schedule_participants_owner_all on public.schedule_participants;
drop policy if exists schedule_participants_auth_participant_select on public.schedule_participants;
drop policy if exists schedule_responses_owner_select_delete on public.schedule_responses;
drop policy if exists schedule_responses_owner_delete on public.schedule_responses;
drop policy if exists schedule_responses_auth_participant_select on public.schedule_responses;
drop policy if exists schedule_responses_auth_participant_insert on public.schedule_responses;
drop policy if exists schedule_responses_auth_participant_update on public.schedule_responses;
drop policy if exists schedule_response_ranges_owner_select on public.schedule_response_ranges;
drop policy if exists schedule_response_ranges_auth_participant_all on public.schedule_response_ranges;
drop policy if exists schedule_confirmed_slots_owner_all on public.schedule_confirmed_slots;
drop policy if exists schedule_confirmed_slots_auth_participant_select on public.schedule_confirmed_slots;

create policy schedules_owner_all on public.schedules
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy schedules_auth_participant_select on public.schedules
for select to authenticated
using (public.schedule_is_auth_participant(id));

create policy schedule_slots_owner_all on public.schedule_slots
for all to authenticated
using (public.schedule_is_owner(schedule_id))
with check (public.schedule_is_owner(schedule_id));

create policy schedule_slots_auth_participant_select on public.schedule_slots
for select to authenticated
using (public.schedule_is_auth_participant(schedule_id));

create policy schedule_participants_owner_all on public.schedule_participants
for all to authenticated
using (public.schedule_is_owner(schedule_id))
with check (public.schedule_is_owner(schedule_id));

create policy schedule_participants_auth_participant_select on public.schedule_participants
for select to authenticated
using (public.schedule_is_auth_participant(schedule_id));

create policy schedule_responses_owner_select_delete on public.schedule_responses
for select to authenticated
using (public.schedule_is_owner(schedule_id));

create policy schedule_responses_owner_delete on public.schedule_responses
for delete to authenticated
using (public.schedule_is_owner(schedule_id));

create policy schedule_responses_auth_participant_select on public.schedule_responses
for select to authenticated
using (public.schedule_response_is_auth_participant(schedule_id, participant_id));

create policy schedule_responses_auth_participant_insert on public.schedule_responses
for insert to authenticated
with check (public.schedule_response_is_auth_participant(schedule_id, participant_id));

create policy schedule_responses_auth_participant_update on public.schedule_responses
for update to authenticated
using (public.schedule_response_is_auth_participant(schedule_id, participant_id))
with check (public.schedule_response_is_auth_participant(schedule_id, participant_id));

create policy schedule_response_ranges_owner_select on public.schedule_response_ranges
for select to authenticated
using (
    exists (
        select 1
        from public.schedule_responses response
        where response.id = schedule_response_ranges.response_id
          and public.schedule_is_owner(response.schedule_id)
    )
);

create policy schedule_response_ranges_auth_participant_all on public.schedule_response_ranges
for all to authenticated
using (
    exists (
        select 1
        from public.schedule_responses response
        where response.id = schedule_response_ranges.response_id
          and public.schedule_response_is_auth_participant(response.schedule_id, response.participant_id)
    )
)
with check (
    exists (
        select 1
        from public.schedule_responses response
        where response.id = schedule_response_ranges.response_id
          and public.schedule_response_is_auth_participant(response.schedule_id, response.participant_id)
    )
);

create policy schedule_confirmed_slots_owner_all on public.schedule_confirmed_slots
for all to authenticated
using (public.schedule_is_owner(schedule_id))
with check (public.schedule_is_owner(schedule_id));

create policy schedule_confirmed_slots_auth_participant_select on public.schedule_confirmed_slots
for select to authenticated
using (public.schedule_is_auth_participant(schedule_id));

revoke all on function public.schedule_is_owner(uuid) from public, anon, authenticated;
revoke all on function public.schedule_is_auth_participant(uuid) from public, anon, authenticated;
revoke all on function public.schedule_response_is_auth_participant(uuid, uuid) from public, anon, authenticated;
