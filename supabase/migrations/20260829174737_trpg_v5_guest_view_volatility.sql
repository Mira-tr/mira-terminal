-- Guest view validates and records credential use through schedule_assert_guest.
-- It therefore must not be exposed as a read-only PostgREST function.
alter function public.schedule_guest_view(text, uuid, text) volatile;
