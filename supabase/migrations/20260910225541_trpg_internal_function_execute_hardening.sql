-- Keep internal event/trigger helpers off the PostgREST RPC surface.
--
-- These SECURITY DEFINER functions are infrastructure callbacks, not client
-- APIs. PostgreSQL grants EXECUTE to PUBLIC by default for new functions, so
-- revoke that inherited access explicitly while preserving database-admin
-- execution for migrations and maintenance.
--
-- Existing trigger/event-trigger bindings continue to call these functions;
-- this change only removes direct EXECUTE privileges from public client roles.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.trpg_v11_round_status_trigger() from public, anon, authenticated;
revoke execute on function public.trpg_v11_schedule_slot_trigger() from public, anon, authenticated;

grant execute on function public.rls_auto_enable() to postgres, supabase_admin;
grant execute on function public.trpg_v11_round_status_trigger() to postgres, supabase_admin;
grant execute on function public.trpg_v11_schedule_slot_trigger() to postgres, supabase_admin;
