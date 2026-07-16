# Studio UX Principles

RELMUA Studio must be usable by a beginner in five minutes.

The goal is not to expose every internal detail.

The goal is to help the user know what they can do safely next.

## Principle 1: Hide Complexity

Studio should hide internal structures during normal use.

Beginners should not need to understand:

- JSON
- Folder paths
- Build
- Manifest
- Git
- Schema
- Canonical URL

Advanced users may inspect these details, but they are not the starting point.

## Principle 2: Data Before Files

Users think in content, not files.

They should see:

- Project
- Creator
- Collection
- Note
- Tool
- Page

Studio decides where data is stored.

## Principle 3: One Next Action

Every screen should clearly show one next action.

Examples:

- Fix this validation error.
- Preview this change.
- Save draft.
- Publish when ready.

Too many equal choices make beginners stop.

## Principle 4: Safe By Default

Dangerous actions must not be the default path.

This applies to:

- Save
- Delete
- Publish
- Import
- Reset
- Migration

The default path should preserve data, create backup when needed, and explain
what will happen.

## Principle 5: Never Lose Data

Studio assumes mistakes will happen.

Therefore, it must be designed around:

- Undo
- History
- Backup
- Rollback
- Import preview
- Migration report

If an operation cannot be recovered, it should not be offered casually.

## Principle 6: Wizard First

Creation flows should start as wizards.

A wizard should ask only what is needed now.

Advanced configuration can appear later.

## Principle 7: Explain Humanly

Studio must explain technical actions in human words.

Examples:

| Technical Word | Human Explanation |
| --- | --- |
| Build | Assemble the public site. |
| Export | Create public data. |
| Manifest | A report of what was built. |
| Validation | Check whether it is safe to publish. |
| Migration | Update old data to the new format. |
| Rollback | Restore the previous state. |

The technical word may be shown in Advanced mode, but the human explanation
should be available everywhere.

## Principle 8: Progressive Disclosure

Beginner screens should hide settings that are not needed yet.

Reveal more detail only when:

- The user asks for it.
- A problem requires it.
- The current mode allows it.

## Principle 9: Everything Previewable

Users should be able to preview before saving or publishing.

Preview reduces fear.

Preview must use the same data rules as build, so it does not lie.

## Principle 10: Automation Over Manual

Studio should automate repetitive and risky steps.

Users should not manually update:

- Navigation
- Breadcrumbs
- Sitemap
- Canonical URL
- Build target list
- Diagnostics list
- Backup placement

Automation must still be visible and explainable.

## Beginner Test

A beginner should be able to answer these within five minutes:

- What can I add?
- What can I edit?
- Is this safe to publish?
- What should I do next?
- Can I undo this?

