# Smart Routing Specification

Studio generates routes from meaning.

Users do not manually maintain route files in Beginner mode.

## Inputs

- Domain.
- Owner.
- Collection Type.
- Slug.
- Visibility.

## Outputs

- Route.
- Navigation entry.
- Breadcrumb.
- Preview route.
- Sitemap entry.
- Canonical URL.

## Rules

- Slug must be valid before route generation.
- Route must be unique in its public context.
- Private items do not produce public routes.
- Creator-owned Collections stay under creator context.

## TRPG Rule

TRPG route changes must preserve compatibility policy.

Existing TRPG search, filter, favorite, and House Rules behavior must not break.

