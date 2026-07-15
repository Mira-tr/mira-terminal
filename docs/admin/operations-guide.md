# RELMUA Terminal Operations Guide

This guide describes the v0.6 Admin Production OS workflow. It does not replace each editor's own Backup or Public Export format.

## Production Flow

1. Open `Terminal`.
2. Check the four top areas: today's status, workspace entry, attention, and recent activity.
3. Open the correct workspace.
4. Edit and save in the module editor.
5. Resolve validation errors.
6. Run the module's Public Export when public data changed.
7. Run System Backup before risky operations.
8. Run `node scripts/build-public.mjs`.
9. Open System Publish and confirm the Build Manifest and preflight result.
10. Human operators complete GitHub Pages settings and DNS work outside the repository.

## Workspace Responsibilities

| Workspace | Responsibility |
| --- | --- |
| Brand | RELMUA public Home, Projects, Tools, Notes, Creators, About, Contact, Navigation, and publish state. |
| Creators | Creator site workspaces. Chikage owns the TRPG feature set. Asagiri does not. |
| System | Backup, Import, Export review, Settings, Publish preflight, Activity Log, and Operations Guide. |

## System Screens

| Screen | Purpose | Destructive |
| --- | --- | --- |
| Backup | Download a full local editing-data snapshot. | No |
| Import | Preview and confirm System Backup import. | Yes |
| Export | Review Public Export targets and output filenames. | No |
| Settings | Read fixed production contracts: URL, CNAME, build command, registry counts. | No |
| Publish | Check Build Manifest, CNAME, Admin boundary, and validation before release prep. | No |
| Activity Log | Review and export local operations. Clearing the log is isolated from content data. | Clear only |
| Guide | Read this workflow in Admin. | No |

## Public Export vs Backup

- Public Export creates public JSON files for `apps/web`.
- Backup includes private editing data and must never be placed in `apps/web` or `dist`.
- System Backup is an additional full local snapshot. It does not change existing per-module backup formats.

## Import Rule

Import must always be:

1. Select file.
2. Parse JSON.
3. Validate backup type and schema.
4. Preview affected storage keys.
5. Confirm.
6. Apply.

Immediate overwrite without preview is not allowed for System Import.

## Build Manifest

`scripts/build-public.mjs` writes `dist/build-manifest.json` with:

- buildVersion
- builtAt
- gitSha
- branch
- sourceRoot
- outputRoot
- publicFileCount
- publicJsonCount
- assetCount
- adminIncluded
- cname
- canonicalOrigin
- warnings
- status

If git data is unavailable, `gitSha` and `branch` may be `null`. Build must remain honest rather than fail for missing git metadata.

## relmua.com Boundary

Code-side work:

- `apps/web/CNAME` is `relmua.com`.
- Build copies CNAME to `dist/CNAME`.
- canonical / OGP / sitemap / robots / manifest use `https://relmua.com/`.
- `dist/admin` must not exist.

Human GitHub Settings work:

- Confirm Pages source.
- Configure custom domain `relmua.com`.
- Confirm DNS check.
- Enable Enforce HTTPS.

Human DNS work:

- Configure records shown by GitHub Pages.
- Route `www.relmua.com` to `relmua.com`.
- Confirm DNS propagation.

## Release Stop Conditions

Do not publish when any of these are true:

- `node scripts/build-public.mjs` fails.
- `dist/admin` exists.
- `dist/CNAME` is missing or not `relmua.com`.
- `dist/build-manifest.json` is missing.
- Public JSON schema/exportType checks fail.
- System Publish has Critical or High issues.
- Recent edits were not exported.
- No recent backup exists before destructive import/reset work.
