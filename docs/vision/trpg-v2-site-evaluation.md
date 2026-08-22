# Chikage TRPG v2 Site Evaluation

Last reviewed: 2026-08-22

Source conversation:
[サイト評価を書く](chatgpt-conversation://6a88a25e-9720-83ee-9b49-fba64f45d08e)

This document turns the referenced conversation into product decisions that can
be implemented in the repository. The linked conversation is context only; this
document is the durable planning source.

## Core Judgment

Chikage TRPG should become the first complete RELMUA v2 area.

The current TRPG pages already contain useful parts, but they still behave like
separate utility pages:

- Scenario Library.
- House Rules.
- Scenario Picker.
- Table Scheduler.

The v2 direction is to connect them into one experience:

```text
Chikage TRPG
  Find a scenario
  Plan a session
  Share the schedule
  Confirm dates
  Use rules for that session
  Record and revisit the table
```

RELMUA remains the entrance and platform. Chikage TRPG is the personal activity
area where these tools gain a stronger voice, visual identity, and workflow.

## Current Site Evaluation

### Scenario Library

Direction is strong, but the page reads too much like a database search screen.

Keep the existing search, filters, tags, rating boundaries, and public-safe data
model. Add a discovery layer above the advanced search so visitors can browse
without already knowing the right filters.

Needed v2 improvements:

- Add shelves such as recently added, favorites, short sessions, long campaigns,
  four-player scenarios, and heavy stories.
- Make scenario detail feel like a work page, not only a modal record.
- Add a clear "Create session from this scenario" route when Sessions exists.
- Pass known scenario data into the Scheduler or Session creation flow.
- Keep Public output free of Admin-only fields such as `memo`, `status`,
  `createdAt`, and `updatedAt`.

### House Rules

The current House Rules page should be rebuilt from a trusted canonical rules
source before visual polish.

Issues to resolve:

- Current content appears too generic for Chikage's actual table rules.
- Known Chikage rule concepts are missing or inconsistent.
- Encoding problems have appeared in visible copy.
- CoC 6th, CoC 7th, and Emoklore should not be merged into one long undirected
  page.

Needed v2 improvements:

- Split rules by system first.
- Group each ruleset by character creation, dice, combat, sanity, growth, and
  session operations.
- Make individual rules searchable and linkable.
- Allow a future Session to select one ruleset.
- Allow per-session rule overrides later, with a share URL that shows only the
  rules used for that table.

### Scheduler

The current Scheduler is a useful static prototype, but it is not yet a full
TRPG table planner.

It should evolve from "collect yes/maybe/no answers" into "complete a session
plan." The key question is not only which single date works, but which set of
dates completes a multi-session scenario with the least friction.

Needed v2 improvements:

- Preserve the phone-first answer flow.
- Keep large tap targets for `yes`, `maybe`, and `no`.
- Support optional per-date time ranges without making every participant edit
  raw time fields by default.
- Generate completion plans from total scenario time and preferred session time.
- Rank plans with visible reason labels, not only a score.
- Track unanswered participants and answer deadlines.
- Promote confirmed plans into Sessions.

## Sessions Direction

Sessions should be the center of Chikage TRPG v2.

Core model:

```text
Scenario Library -> Create Session -> Scheduler -> Confirmed Dates -> Session
                                              |
                                              +-> Chikage Bot notifications
```

Session concepts:

- A session has `created_by` and a current owner/KP; these are not the same
  field.
- The creator is the initial KP.
- The current KP may transfer KP ownership to another authenticated member.
- A session always has exactly one current KP in the MVP.
- Guest participants can answer schedules, but cannot receive Discord DMs or
  receive KP ownership.
- Member metadata should support role, HO, and PC name.
- Session status and individual date status are separate.
- Planned time and actual play time are separate.
- Archive completed sessions without deleting their records.

## Account And Data Direction

Discord login is a strong fit for TRPG users and should be the first account
candidate for Sessions.

Persistent login is required. Users should not need to re-authenticate on every
visit unless the session expires, they log out, or security requires it.

Long-term data ownership:

```text
Supabase DB = primary source
Admin = management client
Public JSON = export and compatibility artifact
Local backup JSON = recovery artifact
```

Before moving static data to the database, define RLS and import/export rules.
Backups must remain previewed and confirmed before import.

## Chikage Bot Direction

The Discord bot belongs to Chikage TRPG, not to RELMUA as a generic official
bot.

Role:

- RELMUA provides the account, session, and database foundation.
- Chikage Bot provides the Discord interface and personality.
- Web remains the place for detailed answers and management.
- Discord remains the place for reminders, short status checks, and links back
  to the web flow.

Notification policy:

- Personal table notifications default to Discord DM.
- Channel posts are opt-in per server or per session.
- Missing Discord linkage should be visible in Session member status.
- User notification settings should include invite, answer request, confirmation,
  changes, reminders, KP management notices, and quiet hours.
- Session-level mute should override global preferences for that session.

Initial bot functions:

- `/卓`: show the user's upcoming sessions.
- `/次の卓`: show the user's next confirmed session.
- `/予定`: show answer status and link to the web Scheduler.
- `/卓作成`: create a minimal session draft and continue setup on the web.

## Visual And Interaction Direction

TRPG v2 should be mobile-first. Mobile is the primary experience, not a reduced
desktop layout.

Visual tone:

- Japanese editorial plus modern dashboard.
- Ink, deep indigo, paper, gray, and restrained accent colors.
- Use line, spacing, and typography for hierarchy instead of wrapping everything
  in cards.
- Avoid making the UI feel like a generic black-and-purple dashboard.

Motion:

- Motion should confirm state changes, not decorate every moment.
- Use short transitions for page changes, selection, saving, and confirmation.
- Respect `prefers-reduced-motion`.
- Keep visual mascot work optional until stable assets exist.

Mini Chikage:

- If introduced, Mini Chikage is a Chikage TRPG UI character, not a RELMUA-wide
  mascot.
- Use her for loading, empty states, saving, scheduler responses, and bot
  identity.
- Assets should be designed first; Codex can implement state machines, CSS/JS
  animation, sprite playback, responsiveness, and accessibility.

## Implementation Sequence

1. Define TRPG v2 information architecture and route map.
2. Rebuild House Rules content from canonical Chikage rules.
3. Add a discovery layer to Scenario Library without weakening existing filters.
4. Design the Session data contract around account, KP/PL, members, dates,
   ruleset, status, and archive.
5. Extend Scheduler from a static answer tool toward completion-plan generation.
6. Add database-backed Sessions only after RLS, import/export, and backup rules
   are documented.
7. Add Discord login and persistent account state.
8. Add Chikage Bot after Sessions events and notification preferences exist.
9. Add visual motion and Mini Chikage hooks once the stable UI states are known.

## Open Questions

- Where should the durable public route for Chikage TRPG v2 live if
  `/creators/chikage/trpg/` remains the compatibility URL?
- Which canonical source should replace the current House Rules content?
- Should Scenario detail become a route before Sessions exists, or stay modal
  until "Create session from this scenario" is real?
- Which Scheduler data should remain creator-neutral for future non-TRPG use?
- How much bot management belongs in Admin versus a Chikage-facing Bot Control
  panel?

