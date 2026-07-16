# Studio Diagnostics Specification

Diagnostics finds problems before publish.

## Diagnostic Categories

- JSON.
- Images.
- Broken links.
- Accessibility.
- SEO.
- Theme.
- Empty content.
- Missing thumbnail.
- Duplicate slug.
- Invalid URL.
- Build.
- Git.
- Creator.
- Collection.

## Severity

| Severity | Meaning | Publish |
| --- | --- | --- |
| Critical | Must fix. | Blocked. |
| High | Should fix before release. | Block by default. |
| Warning | Can publish with awareness. | Allowed. |
| Info | Context only. | Allowed. |

## Message Rule

Every diagnostic must include:

- What happened.
- Why it matters.
- What to do next.

