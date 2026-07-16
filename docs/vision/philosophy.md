# RELMUA v2 Philosophy

RELMUA is not only a website.

RELMUA is a long-running brand operating system for creating, organizing,
validating, publishing, and preserving creative work.

The central question for every future change is:

> Does this feature make RELMUA easier to grow as a brand ten years from now?

If the answer is yes, the feature can move forward.
If the answer is "convenient now, but a future burden", the design must pause.

## Product Identity

RELMUA is the brand.

RELMUA Studio is the production and operation environment.

Public Site and Creator Sites are generated surfaces.

Future PWA and Desktop App surfaces are clients of the same architecture, not
separate products with separate truths.

## Core Principle

Studio is the source of operation.

Data is the source of truth.

Public is the output.

This means:

- Public must not edit.
- Public must not build.
- Public must not own data.
- Studio must not hide data rules inside UI behavior.
- Data contracts must outlive any one screen design.

## Brand OS

RELMUA is not a site builder.

It is a Brand OS.

The role of the OS is to make creative work easier to continue, not only easier
to publish once.

A feature belongs in RELMUA only when it supports at least one of these:

- Better creative continuity.
- Better public quality.
- Better recovery from mistakes.
- Better validation before release.
- Better migration when data evolves.
- Better separation between brand, creator, system, and public output.

## Ten-Year Bias

RELMUA should prefer boring, durable contracts over clever short-term coupling.

Good designs:

- Survive new creators.
- Survive new modules.
- Survive schema migration.
- Survive new clients such as PWA and Desktop.
- Survive rollback.
- Survive partial failures.

Bad designs:

- Require humans to hand-edit JSON.
- Duplicate public and admin data.
- Bind validation to one screen.
- Make Public depend on Studio runtime.
- Treat compatibility fallback as a permanent second source of truth.

## User Experience Standard

The Studio standard is:

> A beginner can understand what is safe, what is broken, and what to do next.

The Public standard is:

> A visitor can understand the brand, find the next meaningful page, and trust
> that only curated content is shown.

The Creator standard is:

> A creator can have an independent site without being swallowed by the brand
> shell or by one module such as TRPG.

## Non-Negotiables

- One canonical data source per domain.
- Validation before publish.
- Backup before destructive write.
- Rollback path for risky operations.
- Migration path for schema changes.
- No arbitrary shell commands from UI.
- No arbitrary file writes from UI.
- Public remains read-only.
- Admin/Studio-only data never leaks to Public.

## Decision Checklist

Before adding a feature, answer:

- Does it improve RELMUA as a ten-year brand?
- Does it preserve the source of truth?
- Can it be validated?
- Can it be backed up?
- Can it be rolled back?
- Can it migrate?
- Can it work without Desktop-only assumptions if later needed?
- Can Public remain an output, not an editor?
- Does it keep Brand, Creator, Module, Plugin, and System responsibilities clear?

