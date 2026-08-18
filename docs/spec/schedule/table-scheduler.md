# RELMUA Schedule Interaction Model

The first public route may live under Chikage TRPG, but RELMUA Schedule must
remain creator-neutral so that multiple creators, events, campaigns, and
non-TRPG plans can share the same scheduling engine.

## Product Goal

The product optimizes for completed sessions, not only for a single agreed date.

The scheduler should answer:

- Which time ranges can this event actually use?
- Which multi-session plan completes the scenario with the least friction?
- Which participants are blocking confirmation?
- Which conflicts come from other confirmed or held schedules?
- Which conflicts are private external calendar busy time?

The long-term user-facing promise is:

```text
The organizer sets the playable window.
Participants answer inside that window.
RELMUA proposes the safest completion plan.
```

The v2 static prototype intentionally starts simpler: guests answer candidate
dates with `yes`, `maybe`, or `no` first, then optionally add a time range only
for dates that need detail. Painting and cross-schedule computed blocks belong in
advanced or account-backed flows so the first shared URL stays fast on phones.

## Scope Ownership

Initial surface:

```text
apps/web/creators/chikage/trpg/scheduler/
```

Internal module terms must stay generic:

- `schedule`
- `event`
- `session`
- `availability`
- `plan`
- `hold`

Do not bake Chikage-only or TRPG-only names into the data model. The Chikage
TRPG presentation may use `卓` in visible Japanese copy where it helps that
audience, but shared state, schema, and calculation functions should use
schedule/event terminology.

## Core Concepts

### Adjustment Window

The organizer defines where answers are allowed.

Examples:

- Date range: `2026-09-01` to `2026-10-15`.
- Weekday windows: weekday `21:00-24:00`, weekend `13:00-24:00`.
- Disabled days: no Wednesday sessions.
- Slot granularity: 30 minutes.
- Cross-midnight end labels such as `25:00` are allowed for TRPG nights.

Participants answer only inside these windows. The UI should not make people
edit a raw `start` and `end` pair for every candidate unless they choose an
advanced mode.

### Availability Painting

Participants select contiguous time cells.

Allowed manual states:

- `available`: can play.
- `maybe`: conditionally possible.
- `unavailable`: cannot play.

Computed states:

- `busy_auto`: blocked by another confirmed schedule or calendar busy.
- `hold_auto`: tentatively blocked by another held schedule plan.
- `unknown`: no answer.
- `override`: participant explicitly accepts a computed conflict.

Manual answers and computed states must be stored separately. A cancelled schedule
or disconnected calendar must remove only computed blocks, not the participant's
manual answer.

### Completion Plan

A completion plan is a list of one or more session instances that together cover
the scenario's required duration.

Inputs:

- Scenario total minutes.
- Preferred session minutes.
- Minimum session minutes.
- Maximum session minutes.
- Date range.
- Adjustment windows.
- Organizer required flag.
- Required participant ids.
- Minimum participant count.
- Whether `maybe` can be used.
- Minimum and maximum gap between sessions.
- Preference for same weekday or same start time.

Outputs:

- Ranked plan candidates.
- Per-session participant summary.
- Reason labels for why a plan is strong or weak.
- Participants who need follow-up.

## Privacy Rule

Other users may see that a participant is unavailable, busy, or held. They must
not see the source details unless the participant is viewing their own account.

Never expose:

- Google Calendar event title.
- Google Calendar event location.
- Google Calendar attendees.
- Other schedule title.
- Other schedule participants.
- Private note.

Allowed shared labels:

- `予定あり`
- `他の日程あり`
- `仮押さえあり`
- `外部予定あり`

## Cross-Schedule Behavior

Confirmed sessions create `busy_auto` blocks for authenticated participants.
Held plans create `hold_auto` blocks.

When Schedule A is confirmed:

- Overlapping candidates in Schedule B become computed busy for the same user.
- The user's manual answers in Schedule B remain unchanged.
- Schedule B owners see only busy/held state, not Schedule A details.
- The user may override only for themselves.

## Data Model

Suggested production tables:

```text
schedules
schedule_participants
schedule_window_rules
schedule_window_overrides
availability_blocks
schedule_candidates
session_plans
session_plan_items
confirmed_sessions
calendar_connections
external_busy_blocks
```

### `schedules`

- `id`
- `creator_id`, nullable
- `campaign_id`, nullable
- `owner_user_id`
- `title`
- `scenario_title`
- `scenario_total_minutes`
- `preferred_session_minutes`
- `min_session_minutes`
- `max_session_minutes`
- `timezone`
- `status`: `draft`, `collecting`, `proposed`, `held`, `confirmed`,
  `changed`, `cancelled`, `expired`
- `allow_maybe`
- `minimum_pl_count`
- `all_required`
- `min_gap_days`
- `max_gap_days`
- `created_at`
- `updated_at`
- `expires_at`

### `schedule_participants`

- `id`
- `schedule_id`
- `user_id`, nullable
- `guest_token_hash`, nullable
- `display_name`
- `role`: `owner`, `participant`, `guest`, `viewer`
- `required`
- `sort_order`
- `created_at`
- `updated_at`
- `expires_at`

### `schedule_window_rules`

- `id`
- `schedule_id`
- `weekday`
- `start_minute`
- `end_minute`
- `enabled`

`end_minute` may be greater than `1440` for cross-midnight TRPG sessions.

### `availability_blocks`

- `id`
- `schedule_id`
- `participant_id`
- `date`
- `start_minute`
- `end_minute`
- `state`: `available`, `maybe`, `unavailable`, `override`
- `source`: `manual`, `rule`, `confirmed_schedule`, `held_schedule`,
  `calendar_freebusy`
- `source_ref`, nullable
- `visibility`: `self`, `schedule`, `owner`
- `created_at`
- `updated_at`
- `expires_at`

The same schedule can have multiple blocks per user. Effective availability is a
computed view and should prioritize:

```text
override > confirmed_schedule/calendar busy > held_schedule > manual unavailable > manual maybe > manual available > unknown
```

### `session_plans`

- `id`
- `schedule_id`
- `label`
- `score`
- `status`: `proposed`, `held`, `confirmed`, `rejected`
- `reason_codes`
- `created_at`
- `updated_at`
- `expires_at`

### `session_plan_items`

- `id`
- `plan_id`
- `sequence`
- `starts_at`
- `ends_at`
- `covered_minutes`
- `score`
- `reason_codes`

## Scoring

Plan scoring should prefer:

- Organizer availability.
- Required participant availability.
- Higher all-OK count.
- Fewer `maybe` answers.
- No computed busy conflicts.
- Fewer unknown answers.
- Natural session length.
- Similar weekdays and start times.
- Gaps inside organizer constraints.
- Completion before the requested deadline.

The UI must expose reason labels instead of only showing a numeric score.

## MVP Prototype

The static prototype may use localStorage only for draft state. It must include:

- Guest-first answer view with compact candidate rows.
- Bulk answer operations that keep 30 candidates answerable within roughly one
  minute.
- Clear save status values for dirty, saving, saved, and error states.
- Organizer setup for title, date range, time preset, and participants.
- Participant switching for static local testing before real sharing exists.
- Ranked recommendations, unanswered participants, detailed aggregation, and
  on-demand completion plans.
- DOM-free calculation functions with unit tests.
- No network writes.
- No secret keys.

Production sharing, login, cross-schedule sync, and Google Calendar integration
must wait for the database and RLS layer.
