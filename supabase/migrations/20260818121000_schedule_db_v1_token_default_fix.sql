-- RELMUA Schedule DB v1 token default fix.
-- Authenticated owners need the share_id default when inserting schedules.
-- Keep token hashing private, but expose the random token generator as a
-- SECURITY DEFINER wrapper so callers do not need direct pgcrypto access.

create or replace function public.schedule_generate_token(byte_count integer default 32)
returns text
language sql
volatile
security definer
set search_path = pg_catalog, public, extensions
as $$
    select translate(rtrim(encode(extensions.gen_random_bytes(greatest(byte_count, 32)), 'base64'), '='), '+/', '-_');
$$;

revoke all on function public.schedule_generate_token(integer) from public, anon, authenticated;
grant execute on function public.schedule_generate_token(integer) to authenticated;
