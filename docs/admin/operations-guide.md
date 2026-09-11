# RELMUA Admin Operations Guide

This guide describes the current RELMUA Admin workflow after the Supabase CMS migration. It does not replace each editor's own Backup or Public Export format.

## Source of Truth

- Supabase CMS is the canonical source for Admin content and site structure.
- Browser `localStorage` remains a compatibility/cache layer for synchronous legacy code and Public Export adapters.
- System Activity Log is still a local operational log; it is not a content source of truth.
- Public `apps/web` remains a static publish target and does not read private CMS tables directly.
- Studio/Tauri remains a compatibility/native bridge. RELMUA Admin is the visible management hierarchy.

## Admin Hierarchy

| Area | Responsibility |
| --- | --- |
| Dashboard | Current Admin status and operational entry points. |
| RELMUA | Public site structure, Home, Projects, Tools, Notes, and Creator directory. |
| Creators | Creator-owned content. Chikage owns the current TRPG feature set. |
| System | Database status, Backup/Import, Public Snapshot review, validation, publish preflight, Activity Log, and settings. |

Chikage is a Creator-owned workspace and is not a root-level peer of RELMUA.

## Production Flow

1. Open RELMUA Admin.
2. Open `System > Database` and confirm the intended Supabase environment, authentication, and access level.
3. Edit content in the appropriate RELMUA or Creator workspace.
4. Resolve validation errors.
5. Run the relevant Public Export / Public Snapshot flow when published content changed.
6. Run System Backup before risky operations.
7. Run `node scripts/build-public.mjs`.
8. Open System Publish and confirm the Build Manifest and preflight result.
9. Complete the GitHub Pages release flow.

## System Screens

| Screen | Purpose | Destructive |
| --- | --- | --- |
| Database | Confirm CMS configuration, authentication, permissions, and migration state. | No |
| Backup | Download a canonical CMS-backed Admin snapshot. | No |
| Import | Preview, create a rollback snapshot, and restore a supported System Backup. | Yes |
| Public Snapshot | Review Public Export targets and output filenames. | No |
| Validation | Validate Admin content and publication contracts. | No |
| Publish | Check Build Manifest, CNAME, Admin boundary, and validation before release prep. | No |
| Activity Log | Review and export local operational events. Clearing it does not delete CMS content. | Clear only |
| Settings | Read fixed production contracts and registry counts. | No |

## System Backup Format

System Backup is versioned independently from per-module backups.

### Schema version 2

Current complete backups use `backupVersion: 2.0.0` and `schemaVersion: 2`.

They contain:

- CMS-backed Home content
- Projects
- Tools
- Notes
- Creators and Creator profile content
- Chikage TRPG scenarios
- TRPG tag and author candidates
- Chikage House Rules
- RELMUA Site Structure (`data.cms.siteSections`)

The snapshot intentionally does **not** contain security ownership data such as:

- `cms_admin_members`
- Supabase Auth users or sessions
- Creator `owner_user_id` assignments
- service-role or other secret credentials

A content backup must never grant Admin or Creator ownership when restored.

### Schema version 1 compatibility

Existing System Backup schema version 1 files are still accepted for restore. They predate DB-only Site Structure backup, so they restore the legacy content/cache targets they contain but cannot recreate Site Structure metadata that was never present in the old file.

## Import Rule

System Import must always be:

1. Select a JSON file.
2. Parse and validate backup type/schema before any write.
3. Preview affected canonical targets.
4. Prepare a rollback backup of the current canonical state.
5. Require explicit confirmation.
6. Write through the CMS authority first.
7. Refresh the local compatibility cache only after successful canonical writes.

When restoring Site Structure, sections present in the current DB but absent from the backup are archived and removed from navigation instead of being hard-deleted.

If a canonical restore fails partway through, Admin performs a best-effort rollback to the pre-import CMS state and does not report success early.

## Public Export vs Backup

- Public Export / Public Snapshot creates public-safe JSON for `apps/web`.
- System Backup includes private editing data and must never be placed in `apps/web` or `dist`.
- The public site stays on the last successful static snapshot if the CMS is unavailable.
- CMS tables are not a runtime dependency of `relmua.com`.

## Build Manifest

`scripts/build-public.mjs` writes `dist/build-manifest.json` with build metadata including file counts, Admin inclusion status, CNAME, canonical origin, warnings, and overall status.

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

- the intended Supabase environment or Admin identity is unclear;
- `node scripts/build-public.mjs` fails;
- `dist/admin` exists;
- `dist/CNAME` is missing or not `relmua.com`;
- `dist/build-manifest.json` is missing;
- Public JSON schema/exportType checks fail;
- System Publish has Critical or High issues;
- recent edits were not exported;
- no recent System Backup exists before destructive import/reset work.
