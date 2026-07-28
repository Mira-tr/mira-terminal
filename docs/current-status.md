# Current Project Status

Last updated: 2026-07-28

This file is the handoff point for continuing work on another PC.

## Current structure

- `apps/admin/` is the canonical management application.
- `apps/studio/` is the secondary Desktop workflow.
- `apps/web/` is the public application.
- Admin navigation is generated from
  `apps/admin/js/features/navigation/adminRouteRegistry.js`.
- Creator-owned destinations are defined in
  `apps/admin/js/features/creators/creatorSiteRegistry.js`.
- TRPG belongs to `creator-chikage`. Asagiri does not own TRPG features.

## Recently completed

- Renamed the user-facing Studio entry to `Desktop機能`.
- Added canonical Admin landing pages for Brand and System.
- Generated the primary Admin navigation from one registry.
- Added Creator Workspaces to Admin.
- Clarified the Public Creators page as the entrance to personal sites.
- Reduced Public TRPG initial results from 50 to 20.
- Collapsed advanced TRPG filters on mobile.
- Increased important mobile navigation targets to at least 44px high.
- Reduced excessive Public desktop spacing and removed duplicated Creators
  introduction copy.
- Replaced unavailable Project links with a non-interactive `公開準備中`
  status.

## Important bug fix

Admin page entry scripts use ES modules and must always be loaded with
`type="module"`.

Removing that attribute prevents the Admin page JavaScript from starting. The
visible symptom on the TRPG page is that the scenario form is not generated,
so scenarios cannot be registered.

`tests/integration-contracts.test.mjs` contains a contract test covering all
current Admin module entry scripts. Do not remove this test when changing the
Admin shell or navigation.

Verified behavior after the fix:

- A new TRPG scenario can be saved and appears in the list.
- An existing scenario can be edited without changing its ID or creating a
  duplicate.
- Legacy scenarios without `ownerCreatorId` are safely assigned to
  `creator-chikage` when edited.
- All current Admin screens start without browser JavaScript errors.

## Verification baseline

The latest verified baseline is:

- Syntax check: 162 files passed.
- Test suite: 226 tests passed.
- Public build completed successfully.
- Public build reported `Admin included: no`.
- `dist/CNAME` remains present.

Run the standard verification before handing off changes:

```text
npm run check
```

If `npm` is unavailable, run the repository scripts with an installed Node.js:

```text
node scripts/check-syntax.mjs
node --test --test-isolation=none
node scripts/build-public.mjs
```

For UI checks, serve the repository root and open the affected route:

```text
dotnet serve -p 8000
```

Key routes:

- `/apps/admin/`
- `/apps/admin/creators/`
- `/apps/admin/trpg/`
- `/apps/studio/`
- `/apps/web/`
- `/apps/web/creators/`
- `/apps/web/creators/chikage/trpg/`

## Suggested next work

The highest-value next structural change is splitting the long Creators Admin
screen into creator-specific management screens:

```text
Creators
├─ 千景
│  ├─ Profile
│  ├─ Works
│  ├─ Contact
│  └─ TRPG / House Rules
└─ 朝霧
   ├─ Profile
   ├─ Works
   └─ Contact
```

Keep the shared creator registry as the source of ownership and destinations.
Do not add TRPG links to Asagiri.

## Starting on another PC

Use a fast-forward-only pull so divergent history is not reconciled
implicitly:

```text
git switch main
git pull --ff-only origin main
git status
```

Read this file and `AGENTS.md` before changing the project.
