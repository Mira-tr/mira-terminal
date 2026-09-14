# Browser Smoke Test

Run this check before a release and after changing an Admin entry script,
scenario storage, Public navigation, or the Scenario Picker.

The local source server keeps the two applications under their source paths:
`/apps/web/` for Public and `/apps/admin/` for Admin. The published build maps
those applications to `/` and `/admin/` respectively.

## Start

```text
npm run serve
```

Open `http://127.0.0.1:8000/apps/web/`. Use a private browser profile when you
do not want the test scenario to remain in your normal Admin data.

## Admin route flow

1. Open `/apps/admin/` and confirm the Home, Brand, Creators, and System
   navigation is present.
2. Open `/apps/admin/brand/`, `/apps/admin/creators/`, and
   `/apps/admin/creators/chikage/`. Confirm each route shows its intended
   workspace and has no browser console errors.
3. Open `/apps/admin/trpg/`, `/apps/admin/trpg/rules/`, and the System routes
   `/apps/admin/system/database/`, `/apps/admin/system/validation/`,
   `/apps/admin/system/export/`, `/apps/admin/system/backup/`,
   `/apps/admin/system/import/`, `/apps/admin/system/publish/`,
   `/apps/admin/system/logs/`, and `/apps/admin/system/settings/`.
4. Confirm the route remains usable, the primary content is visible, and no
   route displays a 404 or runtime error. Do not submit destructive actions as
   part of this route-only pass.

## Admin scenario flow

1. Open `/apps/admin/trpg/`.
2. Confirm the scenario form appears and the browser console has no errors.
3. Register a scenario with a unique title such as `Smoke Test YYYY-MM-DD`.
4. Confirm the saved scenario appears in the list and the total count changes.
5. Edit that scenario, change its title, and save it again.
6. Confirm the ID is unchanged and no duplicate was created.
7. Reload the page and confirm the edited scenario remains.
8. Delete the test scenario if the browser profile is used for real data.

## Public flow

1. Open `/apps/web/`, `/apps/web/creators/`, and `/apps/web/projects/`.
2. Confirm each page renders its main content and the browser console has no
   errors.
3. Open `/apps/web/creators/chikage/trpg/picker/`.
4. Run the picker once and confirm it shows no more than three candidates.
5. Reload the generated URL and confirm it reproduces the same candidates.
6. Test one narrow condition that has no matches and confirm the page explains
   the empty result instead of silently relaxing the conditions.

## Responsive pass

Repeat the Public flow at approximately 390 px and 1440 px viewport widths.
At both widths, reject the release if navigation is unreachable, text overlaps,
controls overflow horizontally, or the primary action is hidden.

## Completion record

Record the date, browser, viewport widths, result, and any remaining manual
checks in `docs/current-status.md`.
