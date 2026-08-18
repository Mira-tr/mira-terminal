# Current Project Status

Last updated: 2026-08-18

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
- Brand Tools now has a first internal browser tool:
  `/apps/web/tools/image-toolkit/`.
- Chikage TRPG now has a static Table Scheduler app:
  `/apps/web/creators/chikage/trpg/scheduler/`.

## Recently completed

- Renamed the user-facing Studio entry to `Desktop機能`.
- Added canonical Admin landing pages for Brand and System.
- Generated the primary Admin navigation from one registry.
- Added Creator Workspaces to Admin.
- Clarified the Public Creators page as the entrance to personal sites.
- Completed the Public Reality Pass:
  - Removed the empty Tools area from Global Navigation, the footer, Home, and
    the sitemap.
  - Kept the Tools URL as a `noindex,follow` compatibility page.
  - Reduced Asagiri to one honest preparation page and removed its empty
    Profile, Works, and Contact routes from public discovery.
  - Replaced the Home migration-log promotion with the public TRPG library.
- Unified new Public Export and Backup identity as `RELMUA Terminal` version
  `1.0.0`, while continuing to accept legacy `MIRA Terminal` backups.
- Re-encoded the four editorial images as WebP, reducing their combined size
  from about 9.8 MiB to 532 KiB.
- Added Public readiness checks for identity, empty-section promotion,
  noindex/sitemap boundaries, local references, and the image budget.
- Made `npm run check` use Node's single-process test isolation so the standard
  verification works in restricted Windows environments.
- Added the Chikage TRPG Scenario Picker:
  - Selects up to three candidates by players, available hours, system, and
    whether R18 may be included.
  - Excludes R18 by default and never silently relaxes the selected conditions.
  - Uses only scenarios with a known upper time bound when hours are selected.
  - Reproduces the same candidates from a shared URL seed.
  - Remains under Chikage's TRPG ownership instead of reopening the empty Brand
    Tools area.
- Reworked the Public Home and Projects presentation:
  - Replaced inflated gallery and representative-work language with an honest
    current-project dossier.
  - Presents `element` as one planning-stage concept and labels its editorial
    image as a concept visual rather than a game screen.
  - Shows the full concept statement and makes the missing demo, video, and
    distribution build explicit.
  - Removed the duplicate `element` entry from the Home link list and made the
    first view state exactly what is currently available.
  - Removed the hidden Tools area from current Brand positioning and shared
    Public footer copy.
  - Corrected the About three-item layout, restored its reverse-story image,
    and clarified the different publication states on the Creators page.
  - Added separate Light and Dark page-wash tokens so Dark mode no longer
    receives the Light theme's strong white overlay.

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
- Added a dependency-free local server (`npm run serve`) so UI verification is
  reproducible on any work PC with the repository's required Node.js runtime.
- Added `docs/browser-smoke-test.md` as the release checklist for Admin scenario
  create/edit persistence, core Public routes, the Scenario Picker, console
  errors, and 390 px / 1440 px responsive checks.
- Fixed Creator management routing so the 千景 card open that
  creator's edit form directly instead of dropping users at a generic list.
- Fixed the Desktop Creator links to use valid Admin-relative destinations and
  kept TRPG actions exclusive to 千景.
- Renamed the main Creator management headings in Admin to clearer Japanese
  labels while retaining `Creators` as the canonical navigation category.
- Made each Creator card disclose which destinations are editable and which
  are still preparation-only, instead of hiding incomplete routes.
- Aligned Creator feature names with their actual Japanese screen names:
  `TRPGシナリオ` and `ハウスルール`.
- Removed Profile double-writing: the legacy 千景 Profile screen now reads and
  writes the Primary Creator record instead of maintaining a second
  `mira_terminal_profile` copy.
- Kept legacy Profile Backup and `public-profile.json` export compatibility,
  while Public Creator pages continue to use `public-creators.json` as their
  canonical data source.
- Public readiness now rejects a stale compatibility `public-profile.json`
  when its name, bio, activities, or links differ from the Primary Creator.
- Removed the legacy Profile compatibility screen from the normal Creator card
  destinations. Its direct URL and import/export compatibility remain
  available, but routine profile editing now starts from `活動者情報`.
- Creator edit URLs now stay synchronized with the form state. Saving,
  cancelling, or opening the new-Creator form removes stale query state, and an
  unknown Creator ID shows a warning instead of silently appearing valid.
- Creator management cards now derive from saved Creator records. Newly added
  Creators appear immediately with an edit route, while a public-site link is
  withheld until a real static Creator site is registered.
- Creator publication now has one shared availability rule. A Creator without
  a registered static site cannot be saved as Public or included in the Public
  Creators Export. Imported legacy data that violates the rule is shown as
  unavailable in the workspace and as a high-priority Validation Center issue.
- Creator records now own Works and public contact links. Admin edits both on
  the Creator form, Public Creators Export v2 removes their private statuses,
  and each registered Creator Works page renders the exported works with a
  truthful empty state when none are public.
- Creator Works and public contacts now use repeatable structured fields
  instead of pipe-delimited text. Items can be added, reordered, and removed;
  duplicate IDs, missing labels, and non-http(s) URLs are rejected before
  saving. Creator workspace destinations now link directly to these editors
  and show managed/Public counts instead of the obsolete preparation status.
- Added the first RELMUA Brand browser tool, Image Toolkit:
  - Runs in the browser without uploading images.
  - Supports image selection, preview, resize bounds, WebP/JPEG/PNG export,
    quality control, and Canvas-based metadata removal.
  - Promotes Tools back into Brand navigation and sitemap because
    `public-tools.json` now contains a real public tool.
  - Keeps TRPG helper tools out of Brand Tools; those remain future
    Creator-scoped work.
- Added the Chikage TRPG Schedule v2.1 prototype:
  - The root scheduler screen is now a compact Dashboard for multiple schedule
    records with all/action/active/confirmed filters instead of fixed status
    sections.
  - Create and Share are actions, not permanent navigation tabs. Creating a
    schedule opens the detail screen and exposes sharing immediately.
  - Schedule Detail derives the primary action from role, schedule status, and
    the current participant's response completeness. An owner who still needs
    to answer sees the answer panel before the owner overview.
  - Guest share URLs open the target schedule directly without passing through
    Dashboard.
  - Guest answer still uses the v2 compact date rows, bulk answers,
    unanswered-only filtering, optional per-date time ranges, and clear
    completion/save feedback.
  - Scheduler logic remains split into browser controller, DOM-free math, state
    normalization, localStorage persistence, and share text helpers.
  - State now uses a local schedule collection with a v2 single-schedule
    migration path. `renderAll()` remains removed; candidate ranking and
    completion plans are still lazy.
  - `docs/spec/schedule/table-scheduler.md` defines the creator-neutral data
    model needed before DB, login, cross-table sync, and calendar integration.

## Verification baseline

The latest verified baseline is:

- Syntax check: 177 files passed.
- Public readiness check: 21 HTML files, 8 Public JSON files, and a 532 KiB
  editorial image total passed.
- Test suite: 257 tests passed.
- Public build completed successfully.
- Public build reported `Admin included: no`.
- `dist/CNAME` remains present.

Browser smoke test completed on 2026-07-31 with the Codex in-app browser:

- Admin Creator routes opened the correct 千景 edit form.
- Desktop Creator links resolved to the correct creator-specific Admin URLs.
- The legacy 千景 Profile screen updated the Primary Creator record; the
  temporary test name was restored to `千景`.
- A temporary scenario was created, edited without duplication, and deleted.
- Home, Creators, Projects, and the Scenario Picker rendered without console
  errors or horizontal overflow at 1440 px and 390 px widths.
- The Scenario Picker returned exactly three candidates and reproduced the same
  candidates after reloading its seeded URL.
- Creator route follow-up passed: an unknown Creator query was removed with a
  warning, a temporary Creator appeared in both the list and workspace cards,
  no nonexistent public-site link was generated, and the temporary record was
  deleted afterward.
- Creator publication follow-up passed: an unregistered Creator was rejected
  when saved as Public with a visible reason and retained form values, then
  saved successfully as Draft and appeared in both management views. The
  temporary record was deleted afterward.
- Creator Works follow-up passed: the 千景 Admin edit route exposed separate
  Works and public-contact inputs, and both registered Creator Works pages read
  the shared Public Creator data. Desktop visual review showed the empty state
  without a duplicate preparation panel; existing responsive grid rules keep
  the same section single-column at mobile widths.
- Structured Creator editor follow-up passed: both Creator workspace cards
  linked Works and Contact as editable, an unsaved Work could be added and
  removed, and a `javascript:` Work URL was rejected with a visible reason.
  Reloading confirmed that the rejected test record was not persisted.

Run the standard verification before handing off changes:

```text
npm run check
```

If `npm` is unavailable, run the repository scripts with an installed Node.js:

```text
node scripts/check-syntax.mjs
node scripts/check-public-readiness.mjs
node --test --test-isolation=none
node scripts/build-public.mjs
```

For UI checks, serve the repository root and open the affected route:

```text
npm run serve
```

Follow `docs/browser-smoke-test.md` for the release-level browser pass.

Key routes:

- `/apps/admin/`
- `/apps/admin/creators/`
- `/apps/admin/trpg/`
- `/apps/studio/`
- `/apps/web/`
- `/apps/web/tools/`
- `/apps/web/tools/image-toolkit/`
- `/apps/web/creators/`
- `/apps/web/creators/chikage/trpg/`
- `/apps/web/creators/chikage/trpg/picker/`
- `/apps/web/creators/chikage/trpg/scheduler/`

## Suggested next work

The highest-value next work is strengthening the visible Public content without
pretending unfinished areas are complete:

1. Test the redesigned Home and Projects pages with real visitors and replace
   the concept visual only when truthful project material, such as prototype
   captures or design sketches, exists.
2. Test the Scenario Picker with real session-planning use and adjust only the
   condition choices that prove confusing. A missing upper play-time bound is
   valid source data, not a cleanup defect; those scenarios are intentionally
   excluded only when the user sets an hours limit.
3. Add enough Asagiri profile or work content to justify public discovery
   before restoring the hidden subpages.
4. Test Table Scheduler with a real KP/PL flow and refine the scoring reasons,
   window presets, and mobile painting ergonomics before adding backend sharing.
5. Expand Image Toolkit only after real usage shows the next operation should
   live in the same workflow.

Keep the shared creator registry as the source of ownership and destinations.
Do not add TRPG links to Asagiri, and do not expose an empty module merely
because its route exists.

## Starting on another PC

Use a fast-forward-only pull so divergent history is not reconciled
implicitly:

```text
git switch main
git pull --ff-only origin main
git status
```

Read this file and `AGENTS.md` before changing the project.
