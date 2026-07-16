# Common Validation Specification

Validation checks whether data is safe to save, preview, or publish.

## Field Rule Format

Each field should define:

- Required.
- Type.
- Length.
- Duplicate rule.
- Validation timing.
- Error message.

## Timing

| Timing | Purpose |
| --- | --- |
| On input | Fast feedback. |
| On save | Protect canonical data. |
| On preview | Protect preview accuracy. |
| On build | Protect generated output. |
| On publish | Final gate. |

## Severity

- Critical: publish blocked.
- High: release should stop.
- Warning: visible but publish allowed.
- Info: context.

## Message Policy

Validation messages must include:

- What is wrong.
- Why it matters.
- How to fix it.

