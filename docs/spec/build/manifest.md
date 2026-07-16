# Build Manifest Specification

Build Manifest describes generated output.

## Required Fields

| Field | Type | Required |
| --- | --- | --- |
| buildVersion | number | yes |
| builtAt | ISO datetime string | yes |
| gitSha | string | yes when available |
| branch | string | yes when available |
| sourceRoot | string | yes |
| outputRoot | string | yes |
| publicFileCount | number | yes |
| publicJsonCount | number | yes |
| assetCount | number | yes |
| adminIncluded | boolean | yes |
| cname | string | yes when configured |
| canonicalOrigin | string | yes |
| warnings | string[] | yes |
| status | string | yes |

## Rules

- `adminIncluded: true` is publish-blocking.
- Missing CNAME is warning or error depending on release target.
- Broken public JSON is publish-blocking.

