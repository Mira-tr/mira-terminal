# TRPG Collection Specification

TRPG is Collection Type 1.

It is not replaced by Collection.

Collection gives TRPG a future architecture while keeping existing behavior.

## Compatibility Requirements

Must remain compatible:

- Existing TRPG JSON.
- Existing Public Export identity.
- Existing Public URL policy.
- Existing search.
- Existing Filter.
- Existing Favorite.
- Existing detail view.
- Existing House Rules.
- Existing Backup and Import expectations.

## TRPG Fields

TRPG scenario fields may include:

- title.
- summary.
- system.
- player count.
- play time.
- rating.
- author.
- tags.
- storage location.
- public URL.
- public warning.

## House Rules

House Rules remain part of the TRPG Collection.

House Rules must preserve:

- Existing section structure.
- Existing public rendering.
- Existing export compatibility.

## Validation

TRPG validation must check:

- Required title.
- Valid rating.
- Valid URL when URL exists.
- Public items do not expose admin-only fields.
- Search/filter fields normalize safely.

## Public Rule

Public TRPG can search, filter, favorite, and show details.

Public TRPG must not edit canonical data.

