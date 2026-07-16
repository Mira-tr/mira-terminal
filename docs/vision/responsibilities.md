# RELMUA v2 Responsibilities

This document prevents responsibility drift.

## RELMUA

RELMUA is the brand.

It owns the public identity, editorial direction, and brand-level presentation.

It does not directly own every activity by every creator.

## RELMUA Studio

Studio owns production operations:

- Editing
- Validation
- Backup
- Activity
- Build
- Preview
- Publish
- Git
- Diagnostics
- Migration

Studio can read and write project files through controlled operations.

Studio must never become a pile of one-off editors. It is the place where data
contracts are enforced.

## Public Site

Public Site is read-only.

It can:

- Display public data.
- Route visitors.
- Load generated JSON.
- Provide search/filter/favorite features where explicitly designed.

It must not:

- Edit data.
- Save canonical project data.
- Build artifacts.
- Run Git.
- Depend on Studio state.
- Reveal Studio-only fields.

## Creator Sites

Creator Sites are independent public spaces under RELMUA.

They can have their own tone, layout, and content priorities.

They must not be treated as Brand pages with a different title.

Creator Sites own creator-level features and personal modules.

Example:

```text
Creators
└── Chikage
    ├── Home
    ├── Profile
    ├── Works
    ├── Contact
    └── TRPG
        ├── Scenario Library
        └── House Rules
```

## Modules

Modules are activity domains or content systems.

Examples:

- TRPG
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

A module is not a plugin.

A module owns content structure and public behavior.

## Plugins

Plugins extend capability.

Examples:

- AI
- Calendar connection
- GitHub connection
- OpenAI connection
- External automation

A plugin does not become the owner of data.

Plugins must operate through contracts.

## System

System owns operations that protect the project:

- Backup
- Import
- Export
- Settings
- Publish
- Activity Log
- Diagnostics
- Migration
- Rollback

System screens should be dense, reliable, and clear. They are production tools,
not marketing pages.

## Responsibility Table

| Area | Owns | Must Not Own |
| --- | --- | --- |
| Brand | RELMUA public identity | Creator module internals |
| Creator | Personal site and activity | Global brand structure |
| Module | Domain content and rules | External service integration |
| Plugin | External capability | Canonical data |
| System | Operations and safety | Editorial content |
| Public | Display output | Editing/build/publish |
| Studio | Operation and validation | Public-only runtime assumptions |

