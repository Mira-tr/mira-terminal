# Public Renderer Specification

Public is renderer only.

It does not edit, build, or own canonical data.

## Responsibilities

Renderer handles:

- Data display.
- Empty state.
- Loading state.
- 404.
- Safe links.
- Text rendering.
- Static fallback when configured.

## Rules

- Do not mutate canonical data.
- Do not expose admin-only fields.
- Do not use user-controlled text as HTML.
- Do not depend on Studio runtime.
- Do not invent content when data is empty.

## Empty State

Empty state should explain the editorial reason.

Bad:

```text
Nothing here.
```

Good:

```text
Only public-ready tools are shown here.
```

