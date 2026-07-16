# Project Validation Specification

Project validation applies to brand works.

## Fields

| Field | Required | Type | Rule |
| --- | --- | --- | --- |
| title | yes | string | 1-120 characters. |
| slug | yes when route exists | string | Unique, lowercase letters/numbers/hyphen. |
| description | no | string | 0-1000 characters. |
| status | yes | string | Known status only. |
| tags | no | string[] | Duplicates removed. |
| url | no | string | http or https only. |

## Timing

- Save: required fields and types.
- Preview: public mapping.
- Publish: duplicate slug, invalid URL, missing public title.

## Error Example

```text
Project title is required.
Add a title so this work can be shown in Projects.
```

