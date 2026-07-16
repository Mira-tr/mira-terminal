# Smart Storage Specification

Studio decides storage from data meaning.

Users do not choose folders in Beginner mode.

## Inputs

- Domain.
- Owner.
- Collection Type.
- Visibility.
- Schema version.

## Outputs

- Canonical JSON path.
- Backup path.
- Build target.
- Activity target.
- Preview target.
- Diagnostics scope.

## Rules

- Allowed paths come from registry and contracts.
- Project Root escape is forbidden.
- Risky writes require backup.
- Public output is generated, not manually edited.
- Advanced mode may show actual paths.

