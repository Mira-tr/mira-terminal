# RELMUA Admin Supabase configuration on Vercel

RELMUA Admin loads browser-safe Supabase connection data from `/api/supabase-public` when deployed on Vercel, with `/config/supabase-public.json` retained as the local-development fallback.

Configure these Vercel environment variables for the RELMUA Admin deployment:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_ANON_KEY` remains a compatibility fallback, but the modern publishable key is preferred.

Never configure or return `SUPABASE_SERVICE_ROLE_KEY` through the public configuration endpoint. The service-role key must not be exposed to browser code.

After changing environment variables, redeploy the project and verify `/api/supabase-public` returns `enabled: true` before using `System > Database`.
