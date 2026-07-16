# Collection Common Fields

These fields are common to Collection Types.

## Field Table

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `type` | string | yes | Must be a known Collection Type. |
| `title` | string | yes | 1-120 characters. |
| `slug` | string | yes | Lowercase letters, numbers, hyphen. Unique per owner/type. |
| `visibility` | string | yes | draft, private, public, archived. |
| `status` | string | yes | Domain-specific state. |
| `tags` | string[] | no | Strings, duplicates removed. |
| `thumbnail` | string | no | Safe project asset reference or empty. |
| `description` | string | no | 0-1000 characters. |
| `owner` | object | yes | ownerType and ownerId. |
| `createdAt` | ISO datetime string | internal | Set by Studio. |
| `updatedAt` | ISO datetime string | internal | Updated by Studio. |

## Validation Timing

- On field change: simple type and length checks.
- On save: full field validation.
- On preview: full validation plus public mapping checks.
- On publish: full validation plus diagnostics.

## Error Message Policy

Messages must be human-readable.

Example:

```text
Title is required.
Add a title so this collection can be shown in Studio and Preview.
```

