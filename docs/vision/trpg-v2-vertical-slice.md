# RELMUA TRPG v2 Vertical Slice

Last updated: 2026-08-22

This document records the first implementation slice that moves TRPG v2 from a
visual prototype toward a real session workflow.

Current verdict:

```text
VERTICAL SLICE COMPLETE
```

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

## Staging E2E

Staging project:

```text
Project: relmua-staging
Ref: xojrvxifeeamydfkhjgp
```

Production project, not touched during staging E2E:

```text
Project: relmua
Ref: wvtsddeegsiiqmgsbfgi
```

Staging browser E2E completed on 2026-08-22:

- Staging Supabase connection: PASS.
- Discord Provider: PASS.
- User A Discord Login: PASS.
- Profile Sync: PASS.
- Login Persistence: PASS.
- User A Create Session: PASS.
- A becomes initial KP: PASS.
- Invite URL: PASS.
- Guest Join: PASS.
- Candidate Create: PASS.
- A Answer: PASS.
- Guest Answer: PASS.
- Aggregate: PASS.
- Confirm: PASS.
- NEXT SESSION: PASS.
- User B Discord Login: PASS.
- OAuth invite return: PASS.
- User B Join: PASS.
- B Answer: PASS.
- KP Transfer A -> B: PASS.
- A becomes PL: PASS.
- B becomes KP: PASS.
- Owner participant exactly one: PASS.
- `schedules.created_by` remains A after transfer: PASS.
- Old KP denied by UI and RPC: PASS.
- New KP allowed: PASS.
- Guest cannot become KP transfer target: PASS.
- Mobile 390 px role persistence and no horizontal overflow: PASS.
- Build / tests: PASS.
- Scenario Library untouched: PASS.

Staging fixture retained:

```text
Title: Codex E2E 卓 09:12:01
Share ID: redacted; check staging directly when regression work requires it
```

The fixture is intentionally retained for future staging regression because it
contains the complete A/B/Guest/KP-transfer flow. Auth users and Discord
profiles must not be deleted, and partial cleanup of participants, responses,
candidates, or confirmed slots would reduce the fixture value.

## Known Issues

- The v2 app currently uses Schedule DB v1 status names internally and maps
  them for display instead of replacing the DB enum.
- Candidate datetime inputs depend on browser local time before the RPC stores
  canonical timestamps and derives Japan-time labels.
- The retained staging E2E fixture contains real staging account display names;
  do not commit screenshots or logs that expose private tokens, guest
  credentials, or secrets.

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

Local and staging verification on 2026-08-22:

- Syntax check passed: 190 files.
- Public readiness passed: 22 HTML, 8 JSON, 532 KiB editorial images.
- Node tests passed for the vertical-slice suite:
  `tests/trpg-v2-vertical-slice.test.mjs`.
- Public build completed.
- Public build reported `Admin included: no`.
- Browser QA at source route:
  `/apps/web/creators/chikage/trpg/v2/`
  - mobile 390 px: no horizontal overflow
  - desktop 1440 px: no horizontal overflow
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

## Production Setup Required

Production migration, Auth configuration, frontend config, and deploy have not
been executed. Use `docs/vision/trpg-v2-release-checklist.md` as the release
gate before any production rollout.

Do not commit Discord client secrets, service role keys, private tokens, guest
credentials, or screenshots/logs containing those values.

Screenshots:

```text
docs/vision/screenshots/trpg-v2/mobile-vertical-slice.png
docs/vision/screenshots/trpg-v2/desktop-vertical-slice.png
```

## Next

Prepare production using `docs/vision/trpg-v2-release-checklist.md`. The first
production step is migration review and backup/PITR confirmation, not applying
changes.
