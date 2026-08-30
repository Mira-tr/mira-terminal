# TRPG V10: Discord DM-first Scheduler

Status: implementation ready; production migration, Discord command registration,
and Edge Function deployment remain release-gated.

## Purpose

Account participants can use the RELMUA Discord application in a DM to check
their schedules and answer an open Round. The web Scheduler remains available
for detailed management, but the normal response loop does not require opening
a browser.

Guests remain on the existing web guest flow. A guest credential is never
treated as a Discord identity.

## Commands

- `/卓`: paginated list of active account-participant schedules.
- `/日程`: select a schedule and view its open Round.
- `/回答`: enters the same schedule selection flow with the response task in
  focus.
- `/次の卓`: nearest future V6 `schedule_sessions` row.
- `/予定`: up to five future scheduled sessions.

The application is intended for Discord User Install and DM use. A guild
installation is optional and is not part of authorization.

## Interaction Flow

Each ephemeral message contains one candidate at a time. It uses legacy
Discord components so ordinary content and controls remain compatible:

- action rows contain no more than five buttons,
- a string select shows at most 25 schedules per page,
- `custom_id` values stay within Discord's 100-character limit,
- the `△` modal provides up to four non-overlapping partial ranges and a
  120-character memo.

The message's custom ID carries only a resource reference and pagination.
Every action reloads and validates membership, role, round, candidate, and
revision through the database. It is not an authorization token or a source of
truth.

## Data Boundary

`20260830170000_trpg_v10_discord_dm_scheduler.sql` adds service-role-only
wrappers for the Edge Function. They:

1. resolve the Discord interaction sender through `profiles.discord_user_id`,
2. set the existing authenticated actor context for the transaction,
3. delegate response mutation to `schedule_account_upsert_response`,
4. delegate confirmation to `trpg_v6_confirm_recommendation_plan`.

The wrappers return no guest credentials or invitation capability tokens. The
Edge Function never exposes its service-role key to a browser or Discord.

## P0 and P1

P0 covers account resolution, schedule browsing, next/upcoming sessions,
candidate response, stale re-answer, partial time, and memo editing.

P1 covers a review-first Personal Availability draft, KP response status, and
recommendation/confirmation. The availability proposal is recomputed at the
explicit apply step; opening the proposal cannot save a response. The KP plan
uses the existing `recommendMultiDayPlan` scheduler engine and then invokes the
existing V6 confirmation RPC, which revalidates the latest response state.

## Deployment

Before production rollout:

1. Apply the additive migration through the established production backup,
   migration-list, dry-run, and read-only verification gate.
2. Confirm `DISCORD_PUBLIC_KEY` is configured only as an Edge Function secret.
3. Deploy `discord-next-session` with `verify_jwt = false`; Discord Ed25519
   request verification remains mandatory inside the function.
4. Configure the Discord application's Interaction Endpoint with the existing
   Edge Function URL and enable User Install for `applications.commands`.
5. Register global commands using
   `scripts/register-discord-dm-scheduler-commands.mjs`. The script reads
   local environment variables and never writes secrets to the repository.
6. Exercise a DM interaction with an account participant and verify no invite
   token, share identifier, credentials, or raw database error is returned.

## Deferred

- DM candidate composer and candidate revision management.
- Next Round creation.
- Guest DM participation.
- Automatic notifications, quiet hours, retry queues, and delivery analytics.
- Preparation commands.
