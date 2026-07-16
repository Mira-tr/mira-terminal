# Game Collection Specification

Game is a future Collection Type.

It must not be confused with legacy Project/Game naming.

## Fields

Game-specific fields may include:

- platform.
- genre.
- development status.
- release URL.
- repository URL when public-safe.
- technology.
- screenshots or placeholders.

## Validation

- `platform`: optional string, 1-80 characters.
- `genre`: optional string, 1-80 characters.
- `development status`: required when public.
- URLs: http or https only.
- Screenshots: project asset references only.

## Public Mapping

Public may show:

- title.
- description.
- status.
- platform.
- genre.
- safe links.
- public-safe visuals.

Public must not show internal memo or private development notes.

