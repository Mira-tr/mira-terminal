# RELMUA Schedule DB v1

This document is the implementation contract for the first Supabase-backed
RELMUA Schedule slice. It reflects the current public prototype at
`9551e58 fix: harden schedule sharing UX`.

DB v1 is intentionally narrow:

- Organizer accounts use Supabase Auth.
- Guests can answer without login.
- Guest writes go through RPC only.
- Schedule sharing uses a high-entropy `share_id`.
- Schedule data expires one year after meaningful activity.
- Realtime, Google Calendar, and cross-schedule busy sync are deferred.

## Current Client Model

The current browser prototype stores a `schemaVersion: 3` collection in
`relmua_schedule_v3`.

State shape:

- `currentUserId`
- `activeScheduleId`
- `activeParticipantId`
- `schedules[]`
- `save.status`

Schedule shape:

- `id`
- `title`
- `description`
- `startDate`
- `endDate`
- `startMinute`
- `endMinute`
- `totalMinutes`
- `sessionMinutes`
- `status`
- `ownerUserId`
- `updatedAt`
- `heldSlotId`
- `confirmedSlotId`
- `participants[]`
- `responses`

Participant shape:

- `id`
- `userId`
- `displayName`
- `role`
- `required`

Response shape:

```text
responses[participantId][slotId] = {
  answer: "yes" | "maybe" | "no" | "unknown",
  note: string,
  ranges: [{ startMinute, endMinute }]
}
```

`unknown` is not persisted as a row in DB v1. Missing response means unknown.

## Slot Decision

DB v1 uses `schedule_slots` as the single source of truth for candidate slots.

Reason:

- Current slots are derived from `startDate`, `endDate`, `startMinute`, and
  `endMinute`, but DB responses need stable FK targets.
- Future schedules must allow different windows per date without changing the
  response model.
- Keeping only derived slots would make response IDs depend on mutable schedule
  settings.

To avoid double management, schedule-level date range and default-time fields do
not exist in DB v1. They remain creation UI helpers only. After persistence,
candidate rows live in `schedule_slots`. Changing the schedule date range must
update slot rows explicitly through the repository or Owner UI. Client code must
not regenerate DB slot identity from schedule defaults after creation.

## Tables

### `schedules`

One scheduling board.

- `id uuid primary key`
- `owner_id uuid not null references auth.users(id)`
- `share_id text unique not null`
- `share_enabled boolean not null default true`
- `title text not null`
- `description text not null default ''`
- `timezone text not null default 'Asia/Tokyo'`
- `status text not null`
- `total_minutes integer not null default 0`
- `session_minutes integer not null default 180`
- `max_participants integer not null default 50`
- `schema_version integer not null default 1`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `last_activity_at timestamptz not null`

`last_activity_at` changes only on meaningful schedule operations:

- schedule edit
- slot edit
- participant change
- guest response
- name update
- range update
- confirmation or hold
- deletion of child schedule data

SELECT/read-only access must not extend expiration.

### `schedule_slots`

Candidate slots for a schedule.

- `id uuid primary key`
- `schedule_id uuid not null references schedules(id) on delete cascade`
- `local_date date not null`
- `start_minute integer not null`
- `end_minute integer not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `sort_order integer not null`
- `label text not null default ''`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

`starts_at` and `ends_at` are stored for accurate ordering and future timezone
work. `local_date` and minute fields preserve the current UI model, including
cross-midnight labels such as 25:00.

### `schedule_participants`

A person on one schedule.

- `id uuid primary key`
- `schedule_id uuid not null references schedules(id) on delete cascade`
- `user_id uuid references auth.users(id)`
- `display_name text not null`
- `role text not null`
- `required boolean not null default false`
- `sort_order integer not null default 0`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Guests have `user_id = null` and credentials in
`schedule_guest_credentials`.

### `schedule_guest_credentials`

Private credential row for guest identity.

- `participant_id uuid primary key references schedule_participants(id) on delete cascade`
- `schedule_id uuid not null references schedules(id) on delete cascade`
- `token_hash bytea not null`
- `created_at timestamptz not null`
- `last_used_at timestamptz not null`

Raw guest tokens are returned once from `schedule_guest_join` and stored only on
the guest device. The DB stores SHA-256 hashes only.

### `schedule_responses`

Yes/maybe/no answer for one participant and one slot.

- `id uuid primary key`
- `schedule_id uuid not null references schedules(id) on delete cascade`
- `participant_id uuid not null`
- `slot_id uuid not null`
- `answer text not null`
- `note text not null default ''`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Unique:

- `(participant_id, slot_id)`

Composite FK constraints ensure the participant and slot belong to the same
schedule.

### `schedule_response_ranges`

Optional detailed availability ranges for the current participant's own answer.

- `id uuid primary key`
- `response_id uuid not null references schedule_responses(id) on delete cascade`
- `start_minute integer not null`
- `end_minute integer not null`
- `answer text`
- `sort_order integer not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `expires_at timestamptz not null`

Ranges are validated in DB and RPC:

- 0 to 30:00
- `end_minute > start_minute`
- inside the parent slot
- max 4 ranges
- no overlap

Guest users can read only their own ranges. Other participants' ranges are Owner
only in v1.

### `schedule_confirmed_slots`

Held or confirmed schedule results. Multiple rows allow multi-session events.

- `id uuid primary key`
- `schedule_id uuid not null references schedules(id) on delete cascade`
- `slot_id uuid references schedule_slots(id) on delete set null`
- `sequence integer not null`
- `status text not null`
- `local_date date not null`
- `start_minute integer not null`
- `end_minute integer not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `created_by uuid not null references auth.users(id)`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `expires_at timestamptz not null`

## Guest Privacy Boundary

Guest public view may include:

- schedule public fields
- candidate slots
- participant display names
- participant answered/unanswered state
- aggregate slot counts
- confirmed slots

Guest public view must not include:

- other participants' detailed ranges
- guest token hashes
- owner id
- raw participant ids for other guests unless needed by UI
- private notes
- future busy source details

Guest verified view may additionally include:

- own participant id
- own display name
- own responses
- own ranges

Other participants' individual yes/maybe/no answers are not exposed to guests in
DB v1 unless a later product decision requires it.

## Access Model

Owner:

- Supabase Auth required.
- `auth.uid() = schedules.owner_id` is the authority.

Authenticated participant:

- Can read schedules they are attached to.
- Can manage only their own participant profile and responses.

Guest participant:

- No login required.
- Can use only RPC functions that validate `share_id`, `participant_id`, and
  raw guest token.

Anonymous stranger:

- Can call public/guest RPC only.
- Cannot directly read or write schedule tables.

## RLS Matrix

| Table | Owner | Auth participant | Guest participant | Anonymous stranger |
| --- | --- | --- | --- | --- |
| `schedules` | direct CRUD | direct SELECT when attached | RPC sanitized read | no direct access |
| `schedule_slots` | direct CRUD | direct SELECT when attached | RPC sanitized read | no direct access |
| `schedule_participants` | direct CRUD | direct SELECT when attached | RPC sanitized read/update own name | no direct access |
| `schedule_guest_credentials` | no client direct access | no client direct access | token validation through RPC | no direct access |
| `schedule_responses` | direct SELECT and DELETE | direct own CRUD | RPC own upsert | no direct access |
| `schedule_response_ranges` | direct SELECT | direct own CRUD | RPC own replacement | no direct access |
| `schedule_confirmed_slots` | direct CRUD or owner RPC | direct SELECT when attached | RPC sanitized read | no direct access |

Anon receives no table grants. Guest behavior is represented by RPC execution
grants, not by table policies.

## RPC Surface

Guest/public functions:

- `schedule_public_view(p_share_id text)`
- `schedule_guest_join(p_share_id text, p_display_name text)`
- `schedule_guest_view(p_share_id text, p_participant_id uuid, p_guest_token text)`
- `schedule_guest_update_name(p_share_id text, p_participant_id uuid, p_guest_token text, p_display_name text)`
- `schedule_guest_upsert_response(p_share_id text, p_participant_id uuid, p_guest_token text, p_slot_id uuid, p_answer text, p_note text, p_ranges jsonb)`

Owner/auth users use normal table access guarded by RLS for v1.

All `SECURITY DEFINER` functions must use a fixed `search_path`. Helper
functions such as token hashing and guest assertion must have direct execute
revoked from `public`, `anon`, and `authenticated`.

## Repository Boundary

The frontend must not scatter Supabase table calls across UI rendering code.
DB v1 uses `SupabaseScheduleRepository` as the boundary:

- `createSchedule()`
- `loadDashboard()`
- `loadSchedule()`
- `loadSharedSchedule()`
- `joinGuest()`
- `loadGuestView()`
- `updateGuestName()`
- `upsertResponse()`
- `updateParticipant()`
- `confirmSlots()`
- `deleteSchedule()`
- `importLocalSchedule()`

The current localStorage adapter remains available for local drafts, guest token
storage, UI state, and legacy migration.

Local DB migration stores successful imports in `relmua_schedule_db_map_v1`.
Guest credentials are stored separately in `relmua_schedule_guest_tokens_v1`.

## Failure and Offline UX

The save indicator keeps the current states:

- `dirty`
- `saving`
- `saved`
- `error`

DB UI may add `offline` and `retrying`, but `answerCompleteState` must only show
DB-backed "saved" after the relevant RPC or table write succeeds. Optimistic row
selection is acceptable; false completion is not.

## Expiration

The default rule is:

```text
expires_at = last_activity_at + interval '1 year'
```

Triggers update `last_activity_at` for writes. Read-only RPC and direct SELECT
must not call touch functions.

Deletion should run daily through Supabase Cron:

```text
delete from public.schedules where expires_at < now();
```

FK cascade removes child rows.

## GitHub Pages Integration

The public app remains static. The frontend may load:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

No service role key, database password, or migration secret may be published.

The current share URL for DB v1 is:

```text
/creators/chikage/trpg/scheduler/#/s/<share_id>
```

Guest edit URL:

```text
/creators/chikage/trpg/scheduler/#/s/<share_id>/me/<participant_id>.<guest_token>
```

The UI must label the edit URL as secret.

`scripts/build-public.mjs` generates `/config/supabase-public.json` in `dist`.
The file contains only public browser configuration. If environment variables
are missing, it is generated with `enabled: false`, so static builds and tests
remain safe before production configuration.

## Production Setup

Required GitHub Actions or Pages build secrets:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Required Supabase project settings:

- Auth enabled for organizers.
- RLS enabled on every schedule table.
- `pgcrypto` extension enabled.
- Optional Supabase Cron after review.
- CORS allows `https://relmua.com`.

Never configure or publish `service_role` in Public.

## Rollback

Rollback strategy before public DB traffic:

1. Remove or disable the generated Supabase public config.
2. Keep the current localStorage prototype active.
3. Do not delete `relmua_schedule_v3`.
4. If a migration was applied during staging, drop the schedule DB objects only
   after exporting any test data that must be preserved.

Rollback strategy after DB launch:

1. Disable `share_enabled` or DB mode in config.
2. Keep legacy `#g=` shared payload handling.
3. Keep guest token localStorage untouched.
4. Restore local-only Schedule UI while preserving DB rows for later recovery.

## Testing Requirements

Implementation must test:

- Owner create/read/update/delete/confirm
- Guest public view/join/own response/own ranges/name update
- Stranger direct table denial
- Guest A cannot overwrite Guest B
- invalid token/share id/disabled share/expired schedule denial
- participant limit
- invalid answer/ranges/duplicate response
- cascade delete
- `last_activity_at` and `expires_at` update on writes
- read-only access does not extend expiration
