# RELMUA v0.5 Phase F — Admin Production Desk

## Goal

Admin is a daily production desk, not a directory of management screens. The shell must help an operator decide what to do next, edit without entering internal identifiers, and distinguish local saves, public exports, backups, imports, and builds.

## Information architecture

- **Dashboard**: today’s public/draft counts, configuration readiness, recent edits, last Public Export, last Backup, and system storage health.
- **Terminal**: responsibility map only. Brand, Creator, and System modules must remain separate.
- **Editors**: local save and content editing.
- **Public Export**: produces public-only JSON. It does not build or deploy the site.
- **Backup Export**: produces restoration data including non-public records.
- **Backup Import / Reset / Delete**: destructive operations, visually separated and confirmed before mutation.
- **Public Build**: repository workflow run with `node scripts/build-public.mjs`; it is not a browser-side export.

## Shared implementation

- `apps/admin/js/adminShell.js` owns early theme application, theme persistence, the operation guide, danger-zone enhancement, and common form semantics.
- `apps/admin/js/features/common/adminTodaySummary.js` reads storage boundaries for Dashboard summaries without coupling Workspace navigation to editor implementations.
- `apps/admin/js/features/common/operationMeta.js` records successful Public Export operations by module.
- Creator-facing form controls use `creatorPicker.js` or the structured Project team editor. Internal Creator IDs remain storage values, not user-entered labels.

## QA matrix

- Themes: Light, Dark, switch, redraw, reload persistence.
- Widths: 390, 430, 768, 1024, 1440.
- Pages: Dashboard, Terminal, Projects, Tools, Notes, Creators, Profile, TRPG, House Rules, Home.
- Data: 0, 1, 10, 100 records; long Japanese/English text; emoji; line breaks; 30+ input tags.
- Interaction: keyboard focus, modal Escape/focus trap/focus restoration, destructive confirmation, add/edit/search/tag add/tag remove/Public Export.
- Delivery: syntax, unit/contract tests, Public Build, `git diff --check`, browser Console and network failures.

## Future changes

When adding an Admin editor:

1. Load `adminShell.js` before the stylesheet to prevent theme flash.
2. Use the shared semantic color variables in both themes.
3. Put restore/reset/delete operations in a detectable operation zone and require confirmation.
4. Record successful Public Export through `operationMeta.js`.
5. Never ask an operator to type a Creator ID when the Creator registry can provide a selection control.
