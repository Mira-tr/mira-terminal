-- RELMUA Schedule DB v1 policy helper grants.
-- RLS policy expressions execute as the querying role, so authenticated users
-- need execute permission on the SECURITY DEFINER helper predicates.

revoke all on function public.schedule_is_owner(uuid) from public, anon, authenticated;
revoke all on function public.schedule_is_auth_participant(uuid) from public, anon, authenticated;
revoke all on function public.schedule_response_is_auth_participant(uuid, uuid) from public, anon, authenticated;

grant execute on function public.schedule_is_owner(uuid) to authenticated;
grant execute on function public.schedule_is_auth_participant(uuid) to authenticated;
grant execute on function public.schedule_response_is_auth_participant(uuid, uuid) to authenticated;
