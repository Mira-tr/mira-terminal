# Compatibility Policy

Compatibility protects RELMUA's long-term archive.

## Schema Version

Schema version describes data shape.

Rules:

- Every production data domain must declare schemaVersion.
- Unknown higher schema versions must not be silently modified.
- Lower schema versions require explicit migration.
- Missing schema versions are allowed only through declared legacy handling.

## Migration Policy

Migration is required when schema changes.

Migration must define:

- Source schema.
- Target schema.
- Normalization.
- Validation after migration.
- Backup before migration.
- Report of changed files.
- Rollback path.

Humans should not be expected to hand-edit JSON as the normal migration method.

## Deprecated Period

Deprecated data, routes, or fields may remain temporarily.

They must have:

- Reason.
- Replacement.
- Removal condition.
- Diagnostics warning when relevant.
- Public link policy.

"Compatibility forever" is not a policy.

## Breaking Change Conditions

A change is breaking when it affects:

- Public URL.
- Public JSON structure.
- Backup or Import format.
- localStorage compatibility.
- Build output contract.
- Registry identity.
- Schema without migration.
- Public rendering of existing data.

Breaking changes require migration plan, rollback plan, and decision record.

## Public JSON Compatibility

Public JSON is a contract with Public views.

Rules:

- Add fields only when readers can ignore them safely.
- Remove fields only with migration and renderer update.
- Do not expose Studio-only fields.
- Do not duplicate canonical data across public files.

## Build Compatibility

Build must remain deterministic and diagnosable.

Changes to build output must update:

- Build manifest contract.
- Public Generator documentation.
- Diagnostics if new risks appear.

## Studio Compatibility

Studio must support older valid project data through migration.

Studio must not destroy data it does not yet understand.

When Studio cannot safely open a project, it should explain why and avoid
writing.

## Browser Admin Compatibility

Browser Admin is a reduced client.

It may lag behind Studio features, but it must not corrupt Studio-owned data.

If Browser Admin cannot safely edit a domain, it should become read-only for
that domain.

