# MIRA Terminal Working Guide

This file applies to the entire repository.

## Project boundaries

- `apps/admin/` is the private management application.
- `apps/web/` is the public application.
- Never expose Admin-only fields such as `memo`, `status`, `createdAt`, or `updatedAt` in Public exports or views.
- Public pages must not embed scenario images or YouTube content.
- Do not design around copying product descriptions from BOOTH or similar services.

## Implementation policy

- Preserve the static HTML/CSS/JavaScript architecture and ES module boundaries.
- Prefer small changes that fit the current module responsibilities.
- Generate DOM with `createElement`, `textContent`, and `replaceChildren`.
- Do not render user-controlled text with `innerHTML`.
- Keep shared business rules in one function instead of duplicating conditions between views, filters, and exports.
- Accept external links only when they use `http:` or `https:`.
- Preserve unrelated user changes in the working tree.

## Data and compatibility

- Treat localStorage and imported backups as untrusted input and normalize values at boundaries.
- Keep backup and Public Export formats versioned.
- When changing Public Export fields or warning types, update `docs/public-data-update.md`.
- Existing stored records may omit newly introduced fields; use safe defaults.

## Verification

Run before handing off changes:

```text
npm run check
```

For UI changes, also verify the affected Admin or Public screen through the local server:

```text
dotnet serve -p 8000
```

Report the change reason, affected files, checks performed, manual checks still needed, and a commit-message suggestion.

