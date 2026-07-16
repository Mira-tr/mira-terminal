# Studio Modes

Studio should support three modes over time:

- Beginner
- Standard
- Advanced

The same data and validation rules apply to every mode.

Modes only change what is visible and how much explanation is shown.

## Mode Overview

| Mode | Purpose | Shows |
| --- | --- | --- |
| Beginner | Start safely in five minutes. | Add, edit, save, preview, publish readiness. |
| Standard | Daily production work. | Validation summary, backup state, diagnostics summary, public status. |
| Advanced | Technical operation and troubleshooting. | Git, manifest, migration, diagnostics detail, build output. |

## Beginner

Beginner mode shows:

- Add
- Edit
- Save
- Preview
- Publish readiness
- One next action
- Human explanations

Beginner mode hides:

- File paths
- JSON
- Git
- Manifest
- Schema
- Raw diagnostics
- Migration internals

## Standard

Standard mode shows:

- All Beginner actions.
- Validation summary.
- Backup status.
- Draft/public/private status.
- Diagnostics summary.
- Import/export with preview.
- Activity summary.

Standard mode still avoids raw internals unless needed.

## Advanced

Advanced mode shows:

- Validation detail.
- Git status.
- Build manifest.
- Diagnostics detail.
- Migration tools.
- Schema version.
- Public mapping.
- File paths.
- Activity log detail.

Advanced mode is for troubleshooting and system operation, not for normal
creative editing.

## Mode Rule

Mode must not change data meaning.

If a value is invalid, it is invalid in every mode.

If an operation is dangerous, it is dangerous in every mode.

Advanced can reveal more detail, but it cannot bypass safety.

