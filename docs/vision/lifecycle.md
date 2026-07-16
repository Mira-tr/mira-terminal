# Module Lifecycle

This document defines the lifecycle of a module.

It applies to modules such as TRPG, Gallery, Store, Wiki, Assets, Games, Music,
Videos, Books, Calendar, and Blog.

## Lifecycle

```text
Idea
  |
Draft
  |
Private
  |
Preview
  |
Published
  |
Deprecated
  |
Archived
  |
Removed
```

## States

| State | Meaning | Allowed Operations |
| --- | --- | --- |
| Idea | The module is being considered. | Write concept, define owner, draft contract. |
| Draft | Structure is being designed. | Create schema draft, validation draft, sample data, internal notes. |
| Private | Module exists but is not public. | Edit data, validate, backup, migrate, preview internally. |
| Preview | Module can be reviewed before release. | Generate preview, run diagnostics, fix validation issues. |
| Published | Module is public. | Edit through Studio, validate, build, publish, backup, migrate. |
| Deprecated | Module remains available but is no longer strategic. | Show notice, freeze or limit edits, migrate links, preserve data. |
| Archived | Module is preserved but not actively shown. | Read, backup, export, restore if needed. |
| Removed | Module is no longer shipped. | Keep rollback path and decision record; remove only after policy allows. |

## Transition Rules

Idea to Draft requires:

- Owner.
- Purpose.
- Expected public surface.

Draft to Private requires:

- Schema draft.
- Validation draft.
- Registry entry.

Private to Preview requires:

- Backup behavior.
- Public mapping draft.
- Diagnostics draft.

Preview to Published requires:

- Critical validation pass.
- Public mapping.
- Build output.
- Accessibility review.
- Rollback path.

Published to Deprecated requires:

- Reason.
- Replacement or archive policy.
- Public link policy.

Deprecated to Archived requires:

- Data backup.
- Redirect or removal policy.
- Decision record.

Archived to Removed requires:

- Confirmation that rollback and Git history are sufficient.
- No active public dependency.
- Decision log or ADR.

## Lifecycle Rule

No module becomes Published only because its UI exists.

Published means the data contract, validation, backup, build, and public mapping
are ready.

