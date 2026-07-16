# RELMUA v2 Data Contract

Data comes before UI.

Studio is an editor for data.

Public is a renderer for data.

## Canonical Data Domains

Every domain must have one canonical source.

Current and future domains include:

- Brand
- Project
- Note
- Tool
- Creator
- TRPG
- Rule
- Theme
- Navigation
- Build Manifest
- Activity
- Backup Manifest

## Required Contract Per Domain

Every domain must define:

- Schema.
- Schema version.
- Normalization.
- Validation.
- Registry entry.
- Backup behavior.
- Import behavior.
- Export behavior.
- Build behavior.
- Public mapping.
- Migration behavior.
- Diagnostics.

If a domain cannot answer these, it is not ready for production.

## Schema Version

Schema versions describe data shape.

They are not the same as app versions or public release versions.

Rules:

- Missing schema can be accepted only with an explicit legacy path.
- Higher unknown schema must not be silently downgraded.
- Lower schema must migrate through a declared migration.
- Migration must be idempotent.
- Human hand-edits must not be the normal migration path.

## Public Mapping

Public mapping converts internal canonical data into public-safe data.

Public data must exclude:

- memo
- draft-only fields
- private fields
- internal status not meant for visitors
- createdAt/updatedAt when not part of public contract
- Studio diagnostics
- backup metadata
- localStorage keys

## Backup Contract

Before a risky write:

- Read current data.
- Validate target path.
- Create backup.
- Write manifest.
- Write temp file.
- Replace atomically when possible.
- Verify checksum.
- Roll back when verification fails.

Backup manifest should include:

- schemaVersion
- appVersion
- createdAt
- operation
- projectRootHash
- git branch and sha when available
- files
- before checksum
- after checksum
- result

## Import Contract

Import must be preview-first.

Required flow:

1. Read file.
2. Parse JSON.
3. Identify module/domain.
4. Validate schemaVersion.
5. Normalize.
6. Show diff or preview.
7. Create rollback backup.
8. Confirm.
9. Write safely.
10. Log activity.

No import should overwrite existing data without preview and backup.

## Validation Levels

Validation should classify issues:

- Critical: publish must stop.
- High: release should stop unless consciously overridden.
- Warning: release can continue, but should be visible.
- Info: operational context.

## Data Contract Rule

Do not create a screen before defining the data contract it edits.

