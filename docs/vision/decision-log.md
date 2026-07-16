# RELMUA Decision Log

This log records why major design decisions were made.

Use ADRs for detailed future architecture decisions. Use this file as the
chronological index of product-level decisions.

# 2026-07

## Decision

RELMUA becomes the brand, not only a website name.

## Background

The project started from a public site and admin tooling, but the long-term
direction expanded into brand operation, creator sites, public generation,
desktop production, and future PWA support.

## Alternatives

- Continue treating the project as a static website.
- Treat Terminal as the public identity.
- Keep creator activity as a global public category.

## Why

The long-term product needs a stable brand layer that can survive new creators,
new modules, new tools, and new surfaces.

## Impact

RELMUA is the umbrella brand. Public pages, Studio, Creator Sites, and future
clients belong under the same product direction.

## Related Documents

- [North Star](north-star.md)
- [Philosophy](philosophy.md)
- [Architecture](architecture.md)

# 2026-07

## Decision

Creator Sites are separated from Brand pages.

## Background

Creator activity and brand-level navigation were starting to mix. This made it
hard to tell whether a page belonged to RELMUA as a brand or to an individual
creator.

## Alternatives

- Keep creator pages as ordinary Brand pages.
- Put creator modules into global navigation.
- Make every creator feature a brand-level module.

## Why

Creators need independent public identity and future scalability. Brand pages
should introduce and route to creators without owning their personal modules.

## Impact

Creator Sites can develop their own tone, navigation, and modules. Brand pages
remain focused on RELMUA-level communication.

## Related Documents

- [Responsibilities](responsibilities.md)
- [Module System](module-system.md)

# 2026-07

## Decision

TRPG belongs under Chikage as a creator-owned module.

## Background

TRPG was historically visible as a public category, but the product direction
defines it as one creator's activity rather than a global RELMUA category.

## Alternatives

- Keep TRPG as a global Brand page.
- Build one shared TRPG module for all future creators.
- Keep old URLs as permanent canonical routes.

## Why

Future creators may have their own TRPG areas. Sharing one owner-switched module
would blur ownership and create long-term coupling.

## Impact

Chikage TRPG is treated as a creator-owned module. Old routes may exist only as
migration or redirect surfaces, not as permanent canonical sources.

## Related Documents

- [Module System](module-system.md)
- [Compatibility Policy](compatibility.md)

# 2026-07

## Decision

Studio becomes the center of production.

## Background

Browser Admin can support editing, but the long-term product requires file
system access, build, backup, rollback, Git, diagnostics, and migration.

## Alternatives

- Keep Browser Admin as the main production tool.
- Build only static scripts.
- Move all operations into Public pages.

## Why

Production operations need stronger safety and system access than Public or a
limited browser editor should have.

## Impact

Desktop Studio becomes the primary production environment. Browser Admin remains
a reduced surface for emergency correction, light editing, review, and future
PWA work.

## Related Documents

- [Studio](studio.md)
- [Architecture](architecture.md)

# 2026-07

## Decision

Public Generator is adopted.

## Background

Public pages must remain fast, static, and safe while Studio gains editing and
validation responsibilities.

## Alternatives

- Edit Public files directly.
- Make Public load Studio state.
- Let each page generate its own public data.

## Why

Generated Public output preserves safety, repeatability, and clear separation
between operation and viewing.

## Impact

Public becomes an output. Build and generation become explicit product
responsibilities.

## Related Documents

- [Public Generator](public-generator.md)
- [Data Contract](data-contract.md)

# 2026-07

## Decision

Brand and Creator responsibilities are separated.

## Background

Brand pages and creator pages can look similar if they share too much structure,
but they do not serve the same purpose.

## Alternatives

- One shared navigation for all pages.
- Treat creator sites as sub-sections of About.
- Put creator module details into Brand pages.

## Why

Brand introduces RELMUA. Creator Sites introduce people and their work. Mixing
them weakens both.

## Impact

Brand pages route to creators. Creator Sites own creator-specific modules and
contact surfaces.

## Related Documents

- [Responsibilities](responsibilities.md)
- [North Star](north-star.md)

# 2026-07

## Decision

Data First is adopted as a constitutional principle.

## Background

As editors, previews, and clients increase, UI-driven data decisions would make
migration and compatibility fragile.

## Alternatives

- Store page-specific state as the primary model.
- Let each editor define its own data shape.
- Treat Public JSON as the editable source.

## Why

Data must survive UI redesigns, new clients, migration, and publication changes.

## Impact

Every domain must define schema, validation, backup, build, and public mapping
before it becomes a stable production feature.

## Related Documents

- [Constitution](constitution.md)
- [Data Contract](data-contract.md)

# 2026-07

## Decision

Desktop Studio and future PWA have different authority levels.

## Background

Desktop can access file system, Git, build, and rollback. PWA may support daily
light work but should not own high-risk operations.

## Alternatives

- Give Browser/PWA the same authority as Desktop.
- Avoid PWA entirely.
- Keep all work in static scripts.

## Why

Different clients need different safety boundaries while sharing the same data
and validation contracts.

## Impact

Desktop Studio owns high-authority operations. Browser/PWA can support review,
draft, preview, and light editing where safe.

## Related Documents

- [Studio](studio.md)
- [Architecture](architecture.md)
- [Compatibility Policy](compatibility.md)

