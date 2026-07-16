# RELMUA Studio

RELMUA Studio is the primary production environment.

It is not only an admin screen.

It is the desk where the brand is maintained.

## Studio Responsibilities

Studio owns:

- Editing
- Validation
- Backup
- Activity
- Build
- Preview
- Publish
- Git
- Diagnostics
- Migration

## Studio Workspaces

Studio is organized around:

- Brand
- Creators
- System

Brand handles RELMUA-level public structure.

Creators handle creator sites and creator-owned modules.

System handles safety, release, diagnostics, and operations.

## Health Dashboard

Studio startup should answer:

- Is the project healthy?
- Is the last build valid?
- Are there validation errors?
- Is Git dirty?
- Is backup recent?
- Are there drafts?
- Are there broken links?
- Are there warnings?
- Is publish ready?

The user should know what to do today without hunting through every screen.

## Editing Standard

Studio forms should:

- Show current location.
- Show save state.
- Show validation.
- Separate dangerous actions.
- Keep common actions reachable.
- Avoid unnecessary vertical sprawl.
- Support keyboard operation.
- Keep dense production information readable.

## Desktop Powers

Desktop Studio may use:

- File System
- Git
- Build
- Validation
- Preview
- Publish
- Backup
- Rollback

These powers require guardrails.

## Browser Admin

Browser Admin is a reduced client.

It is useful for:

- Emergency correction.
- Light editing.
- Review.
- PWA workflows.

It should not be treated as the full replacement for Studio.

## Mobile/PWA

Mobile/PWA can support:

- Notes
- Profile
- Draft
- Preview
- Notifications

Mobile/PWA must not support:

- Git.
- Build.
- Publish.
- Reset.

## Studio Safety Rules

- No arbitrary shell commands.
- No arbitrary path writes.
- Project Root access only.
- Backup before risky writes.
- Preview before import overwrite.
- Validation before publish.
- Activity log for important operations.
- Rollback path for destructive changes.

