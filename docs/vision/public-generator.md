# RELMUA v2 Public Generator

Public Generator turns validated data into public artifacts.

Public is output, not source.

## Responsibilities

Public Generator owns:

- Public JSON.
- Static HTML.
- CSS and JS assets.
- sitemap.
- robots.
- web manifest.
- canonical URLs.
- OGP metadata.
- build manifest.
- preview artifacts.

## Inputs

Inputs must be canonical data plus validated configuration.

Examples:

- Brand config.
- Home config.
- Projects.
- Tools.
- Notes.
- Creators.
- Creator modules.
- Theme.
- Navigation.

## Outputs

Outputs must be deterministic.

The same input should produce the same public structure, except for declared
metadata such as build timestamp.

## Public Safety

Public output must never include:

- Admin-only fields.
- Backup files.
- Import files.
- localStorage state.
- diagnostics internals.
- private creator data.
- unpublished module data.

## Build Manifest

Every build should produce a manifest with:

- buildVersion
- builtAt
- gitSha
- branch
- sourceRoot
- outputRoot
- publicFileCount
- publicJsonCount
- assetCount
- adminIncluded
- cname
- canonicalOrigin
- warnings
- status

## Preview vs Build

Preview is for fast review.

Build is for release artifacts.

Preview can be partial and interactive.

Build must be complete and strict.

## Failure Rule

If a critical validation fails, Public Generator must not produce a publish-ready
release.

It may produce diagnostic artifacts, but they must not be confused with release
output.

