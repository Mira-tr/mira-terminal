# Studio Workspace Specification

Studio has three top-level workspaces:

- Brand
- Creators
- System

## Brand Workspace

Owns RELMUA-level content:

- Home.
- Projects.
- Tools.
- Notes.
- Creators index.
- About.
- Contact.
- Navigation.

Does not own:

- Creator private profile details.
- Creator-specific modules.
- TRPG internals.

## Creators Workspace

Owns creator sites.

Each creator can have:

- Home.
- Profile.
- Works.
- Contact.
- Collections.

TRPG belongs under Chikage as a Collection Type.

## System Workspace

Owns operations:

- Backup.
- Import.
- Export.
- Build.
- Publish.
- Diagnostics.
- Activity Log.
- Settings.
- Migration.

## Workspace Rules

- Every screen must show current workspace.
- Every item must have one owner.
- Creator modules must not appear as Brand-owned features.
- System operations must not be mixed into content editing screens unless needed
  as status or next action.

