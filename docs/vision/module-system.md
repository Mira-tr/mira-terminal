# RELMUA v2 Module System

Modules define creative domains.

They are not plugins.

## Module Definition

A module is a content system with:

- Identity.
- Owner.
- Schema.
- Validation.
- Public mapping.
- Admin/Studio editor.
- Preview behavior.
- Build behavior.
- Backup behavior.
- Diagnostics.

## Current Module Example

Chikage TRPG is a creator-owned module.

It contains:

- Scenario Library.
- House Rules.

It belongs under the Chikage creator site, not under Brand as a global category.

## Future Modules

Future modules may include:

- Gallery
- Store
- Wiki
- Assets
- Games
- Music
- Videos
- Books
- Calendar
- Blog

Adding a module should primarily mean:

1. Add module registry entry.
2. Add schema.
3. Add validation.
4. Add editor.
5. Add preview adapter.
6. Add public mapping.
7. Add diagnostics.
8. Add backup/import/export behavior.

It should not require rewriting Brand, Creator, System, or Public architecture.

## Module Registry Contract

Each module registry entry should define:

- moduleId
- ownerType
- ownerId
- moduleType
- title
- description
- status
- schema
- adminPath or studioRoute
- publicPath
- features
- dataSources
- buildOutputs
- diagnostics

## Module ID Rule

Module IDs should communicate ownership when ownership matters.

Example future direction:

```text
module-creator-chikage-trpg
```

This makes it clear that Chikage TRPG is not a shared global TRPG module.

## Feature Contract

Features are internal to modules.

Example:

```text
TRPG
├── Scenario Library
└── House Rules
```

A feature can have its own editor and public route, but it does not become a
top-level module unless its data contract requires it.

## Module Boundary Rules

- Brand can link to modules, but does not own module internals.
- Creator can own modules.
- System validates modules.
- Public renders module output.
- Plugins can assist modules, but do not define module schemas.

