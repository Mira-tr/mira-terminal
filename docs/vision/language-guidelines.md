# Language Guidelines

RELMUA should speak in human language first.

Technical terms can exist, but they must not be the only explanation.

## Rule

Do not show a technical word alone when the user needs to decide what to do.

Pair the word with a human explanation.

## Preferred Terms

| Technical Term | Human Expression |
| --- | --- |
| Build | Assemble the public site. |
| Export | Create public data. |
| Publish | Publish the site. |
| Import | Bring data into Studio. |
| Backup | Save a restorable copy. |
| Rollback | Return to the previous state. |
| Manifest | Build report. |
| Validation | Check whether it is safe. |
| Diagnostics | Find problems before publishing. |
| Schema | Data shape. |
| Migration | Update old data to the new shape. |
| Canonical URL | Official page address. |
| Registry | List of known items. |
| Module | Content area. |
| Collection | Structured group. |
| Plugin | Add-on capability. |

## Studio Tone

Studio should be:

- Calm.
- Clear.
- Direct.
- Recoverable.
- Helpful without being childish.

Studio should avoid:

- Error messages with no next action.
- Raw technical terms in Beginner mode.
- Warnings that sound like blame.
- Success messages that hide important details.

## Public Tone

Public should be:

- Editorial.
- Warm.
- Precise.
- Easy to scan.

Public should avoid:

- Internal architecture words.
- Admin terms.
- JSON or build language.
- Explaining implementation to visitors.

## Error Message Pattern

Use:

1. What happened.
2. Why it matters.
3. What to do next.

Example:

```text
This note cannot be published yet.
It needs a title before visitors can read it.
Add a title, then preview again.
```

## Success Message Pattern

Use:

1. What succeeded.
2. What changed.
3. What can happen next.

Example:

```text
Public data was created.
The Projects page can now use the latest saved content.
Preview the site before publishing.
```

## Language Test

Before shipping a label, ask:

- Would a beginner understand this?
- Does it describe the result?
- Does it avoid unnecessary internals?
- Does it tell the user what to do next?

