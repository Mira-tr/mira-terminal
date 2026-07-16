# Activity Log Specification

Activity Log records important operations.

It helps humans understand what happened and how to recover.

## Required Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Unique log entry ID. |
| `occurredAt` | ISO datetime string | yes | When the operation happened. |
| `target` | object | yes | Domain, ID, and human label. |
| `operation` | string | yes | Save, import, backup, build, publish, restore, validate, etc. |
| `result` | string | yes | success, warning, error, cancelled. |
| `message` | string | yes | Human explanation. |
| `undoAvailable` | boolean | yes | Whether Studio can undo or restore. |
| `backupRef` | string | no | Backup manifest reference when available. |

## Result Rules

- `success`: operation completed.
- `warning`: completed with issues.
- `error`: did not complete.
- `cancelled`: user stopped the operation.

## Display

Beginner:

- Show recent entries with human messages.

Standard:

- Add filters.

Advanced:

- Show technical details and export.

