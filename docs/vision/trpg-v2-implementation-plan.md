# RELMUA TRPG v2 Implementation Plan

Last updated: 2026-08-22

This plan translates the visual direction into implementation phases while
protecting existing TRPG functionality.

## MVP

Purpose: establish the v2 visual language without breaking the current Scenario
Library, Picker, Scheduler, or House Rules pages.

Deliverables:

- Reference Board.
- Visual System.
- Isolated TRPG Home Visual Prototype.
- Mobile-first layout and desktop expansion behavior.
- Character placeholder architecture.
- Motion rules in CSS.

Implementation notes:

- Keep the prototype at `/creators/chikage/trpg/v2/` until the route decision is
  made.
- Mark the prototype `noindex,follow`.
- Do not change Scenario Library search logic.
- Do not alter scenario data structure.
- Do not add database migrations.
- Do not introduce large animation libraries.

Status: implemented as an isolated noindex route, then polished through visual
review.

## Vertical Slice

Purpose: connect the v2 home to real user flows.

Implemented in code:

- Account UI with Discord as the primary login action.
- Supabase Auth session persistence through the existing browser client.
- My Sessions static-to-data transition using Schedule DB v1.
- Session creation with creator as initial KP.
- Invite URL and Join flow for authenticated users and Guests.
- Candidate creation.
- Mobile `○ / △ / ×` answer flow.
- Owner aggregate view.
- Schedule confirmation and NEXT SESSION calculation.
- KP transfer RPC.

Implementation notes:

- See `docs/vision/trpg-v2-vertical-slice.md`.
- The implementation reuses existing Schedule DB v1 tables and RLS instead of
  creating parallel `sessions` tables.
- New migration is prepared at
  `supabase/migrations/20260822170000_trpg_v2_vertical_slice.sql`.
- The migration has not been applied to production by this plan.

## Later

Purpose: polish the vertical slice after staging verification.

Deliverables:

- Apply the v2 migration to staging after Supabase review.
- Run real Discord OAuth with two authenticated accounts and one Guest.
- Verify RLS denial cases against the staging database.
- Route decision for Chikage TRPG Home versus Scenario Library compatibility.
- Scenario Library visual pass using the v2 tokens.
- House Rules content rebuild from canonical Chikage rules.
- Scheduler v3 deeper mobile answer flow.
- HO / PC name editing.
- Session archive.

Constraints:

- Scenario Library remains Chikage's owned shelf, not a public marketplace.
- Scheduler should not be forced from every scenario detail.
- Guest participation remains possible.
- KP/PL is a session relation, not an account type.

## Future

Purpose: build the full account-backed platform.

Deliverables:

- Planned versus actual schedule times.
- Chikage Bot.
- Bot Control Web.
- Notification preferences and quiet hours.
- Google Calendar export first, calendar busy-state reading later.
- Admin DB source of truth with JSON backup/export.
- Audit log.

## First Prototype Route

```text
apps/web/creators/chikage/trpg/v2/index.html
apps/web/creators/chikage/trpg/v2/css/trpg-v2-home.css
```

The route is intentionally isolated. Once design review passes, choose whether
to:

- promote v2 to `/creators/chikage/trpg/` and move Scenario Library to
  `/creators/chikage/trpg/library/`, or
- keep Scenario Library at the canonical route and expose TRPG Home elsewhere.

## Review Checklist

- Does the first viewport feel like a memorable TRPG entrance?
- Does the page still have clear app routes?
- Does mobile feel primary?
- Are rows and typography doing more work than cards?
- Are references translated into RELMUA's voice rather than copied?
- Are character hooks useful without final character art?
- Can existing TRPG pages continue to pass tests unchanged?
