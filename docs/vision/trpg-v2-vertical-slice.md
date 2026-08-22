# RELMUA TRPG v2 Vertical Slice

Last updated: 2026-08-22

This document records the first implementation slice that moves TRPG v2 from a
visual prototype toward a real session workflow.

## Scope

Target route:

```text
apps/web/creators/chikage/trpg/v2/
```

The slice reuses Schedule DB v1 as the session data source. It does not create
parallel `sessions` tables and does not change Scenario Library search, JSON,
or display logic.

## Implemented In Code

- Discord OAuth entry through Supabase Auth:
  `SupabaseScheduleRepository.signInWithDiscord()`.
- Persistent auth relies on the existing Supabase browser client settings:
  `persistSession: true`, `autoRefreshToken: true`, and
  `detectSessionInUrl: true`.
- TRPG v2 My Sessions app shell at the isolated v2 route.
- Session creation through `trpg_v2_create_session`.
- Creator is stored as immutable `created_by`; current KP remains `owner_id`.
- Session creator is automatically inserted into `schedule_participants` as the
  owner/KP.
- Invite URL format:

```text
/creators/chikage/trpg/v2/#/join/<share_id>
```

- Authenticated account join uses existing `schedule_account_join`.
- Guest join and guest response use existing guest credential RPCs.
- Candidate creation uses `trpg_v2_add_candidate`.
- Account and Guest answers use existing `schedule_account_upsert_response` and
  `schedule_guest_upsert_response`.
- KP aggregate view is shown from owner-accessible responses.
- Date confirmation uses existing `schedule_owner_confirm_slots`.
- NEXT SESSION is calculated from future confirmed slots across all joined
  schedules.
- ACTION REQUIRED is calculated from unanswered candidates for the current
  participant.
- KP transfer RPC exists as `trpg_v2_transfer_kp`.

## Database

New migration:

```text
supabase/migrations/20260822170000_trpg_v2_vertical_slice.sql
```

It extends Schedule DB v1:

- `profiles.avatar_url`
- `profiles.discord_user_id`
- `schedules.created_by`
- `trpg_v2_upsert_profile_from_auth()`
- `trpg_v2_create_session(text, integer, text)`
- `trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text)`
- `trpg_v2_transfer_kp(uuid, uuid)`

Status mapping for TRPG v2:

| Schedule DB v1 | TRPG v2 |
| --- | --- |
| `draft` | `DRAFT` |
| `collecting`, `ready` | `SCHEDULING` |
| `held`, `confirmed` | `SCHEDULED` |
| `archived` | `COMPLETED` |
| `expired` | `CANCELLED` |

The migration has not been applied to production from this task. Apply it only
after Supabase project review.

## RLS And Security

The slice relies on Schedule DB v1 RLS:

- Participants can read joined schedules.
- Owners/KP can manage slots, participants, and confirmed slots.
- Authenticated participants can update only their own responses.
- Guests can write only through token-verified RPCs.
- Anonymous users cannot directly read schedule tables.

New v2 RPCs are granted only to `authenticated`. Guest participation continues
through the existing guest RPCs.

KP transfer is transactional inside one security-definer function:

- Only current `owner_id` can transfer.
- Target must be a logged-in participant on the same schedule.
- Guest transfer is rejected.
- New owner receives role `owner`.
- Previous owner becomes role `participant`.

## Mobile UI

The v2 route keeps the existing dark editorial visual system. The live app area
is constrained to MY SESSIONS and uses:

- line-based blocks rather than card grids,
- large mobile answer buttons for `○ / △ / ×`,
- invite copy field for KP,
- mobile-friendly create and candidate forms,
- loading, empty, error, unauthenticated, and config-missing states.

The route was checked at 390 px with Supabase disabled:

- no horizontal overflow (`scrollWidth === clientWidth === 390`),
- bottom dock height: 56 px,
- config-missing state renders without breaking the page.

## Known Issues

- Real Discord login was not verified in this local run because the public
  Supabase config is unavailable in the repository root server.
- The migration was not applied to a Supabase project in this task.
- Full live multi-user E2E still needs staging data:
  User A create -> User B join -> both answer -> KP confirm -> both see NEXT.
- The v2 app currently uses Schedule DB v1 status names internally and maps
  them for display instead of replacing the DB enum.
- Candidate datetime inputs depend on browser local time before the RPC stores
  canonical timestamps and derives Japan-time labels.

## Deferred

- Discord Bot `/次の卓`
- 日程確定DM
- HO / PC name editing UI
- Agenda
- Google Calendar
- Campaign / Co-KP
- Quiet Hours
- Scenario Library visual rebuild
- House Rules DB rebuild
- Admin DB CRUD

## Verification

Local verification on 2026-08-22:

- Syntax check passed: 190 files.
- Public readiness passed: 22 HTML, 8 JSON, 532 KiB editorial images.
- Node tests passed: 297 tests.
- Public build completed.
- Public build reported `Admin included: no`.
- Browser QA at source route:
  `/apps/web/creators/chikage/trpg/v2/`
  - mobile 390 px: no horizontal overflow
  - desktop 1440 px: no horizontal overflow
  - only expected console 404 was missing `/config/supabase-public.json`
- Added staging verification SQL:
  `supabase/tests/trpg_v2_vertical_slice_verification.sql`
  - User A creates a session and becomes KP.
  - User B joins and answers as PL.
  - Guest joins and answers through token RPC.
  - PL management attempts are denied.
  - Guest impersonation is denied.
  - Non-member reads/writes are denied.
  - KP confirms a date.
  - KP transfer to logged-in User B succeeds.
  - Former KP management is denied.
  - New KP management succeeds.

## External Setup Required

This repository currently contains only `.env.example` with empty Supabase
variables. No `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DISCORD_*`, or
staging project variables were available in the local environment, and the
Supabase CLI was not installed on PATH.

Before this can be marked `VERTICAL SLICE COMPLETE`, a human must provide or
configure a safe non-production Supabase target.

Required operation:

```text
Apply migration:
supabase/migrations/20260822170000_trpg_v2_vertical_slice.sql

Run verification:
supabase/tests/trpg_v2_vertical_slice_verification.sql
```

Required public browser config for local/staging build:

```text
SUPABASE_URL=<staging project URL>
SUPABASE_PUBLISHABLE_KEY=<staging publishable anon key>
```

Required Supabase Dashboard settings:

- Enable Discord Auth provider.
- Use only minimal Discord OAuth scopes needed for identity/profile/avatar.
- Add redirect allow-list entries for local development, staging, and
  `https://relmua.com`.

Suggested redirect URLs:

```text
http://127.0.0.1:8000/apps/web/creators/chikage/trpg/v2/
https://<staging-host>/creators/chikage/trpg/v2/
https://relmua.com/creators/chikage/trpg/v2/
```

Do not commit Discord client secrets, service role keys, private tokens, or
guest credentials.

Screenshots:

```text
docs/vision/screenshots/trpg-v2/mobile-vertical-slice.png
docs/vision/screenshots/trpg-v2/desktop-vertical-slice.png
```

## Next

Apply the migration to a staging Supabase project with Discord provider enabled,
then run the full live flow with two authenticated users and one Guest.
