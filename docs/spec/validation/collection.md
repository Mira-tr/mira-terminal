# Collection Validation Specification

Collection validation combines common rules and type-specific rules.

## Common Rules

| Field | Required | Type | Duplicate Rule |
| --- | --- | --- | --- |
| type | yes | string | Must be known. |
| title | yes | string | Not duplicate within same owner/type when public. |
| slug | yes | string | Unique within owner/type. |
| visibility | yes | string | Known value only. |
| tags | no | string[] | Duplicates removed. |
| owner | yes | object | Must resolve. |

## Type-Specific Rules

TRPG:

- Valid rating.
- Valid public URL.
- Search/filter fields normalize safely.

Game:

- Public status is known.
- Public links are safe.

Tool:

- Category exists when public.
- Launch URL is valid when required.

Custom:

- Must provide its own schema and public mapping.

## Timing

- Save: common and type-specific basic validation.
- Preview: public mapping validation.
- Publish: full diagnostics.

