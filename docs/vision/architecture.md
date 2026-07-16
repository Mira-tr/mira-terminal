# RELMUA v2 Architecture

This document defines the target architecture for RELMUA as a brand operating
system.

## Target Shape

```text
          RELMUA Studio
                 |
      +----------+----------+
      |          |          |
   Brand     Creators     System
      |          |          |
      +----------+----------+
                 |
          Validation Engine
                 |
            Build Engine
                 |
          Public Generator
                 |
      +----------+----------+
      |          |          |
   relmua.com  Preview   Mobile/PWA
```

## Source and Output

Studio is the operating center.

Public surfaces are generated outputs.

Creator Sites are public outputs with creator-specific identity and structure.

Preview is a fast rendering layer for review, not a second implementation of
Public.

PWA and Desktop are clients of shared data and validation contracts.

## Main Domains

### Brand

Brand owns RELMUA-level public information:

- Home
- Projects
- Tools
- Notes
- Creators index
- About
- Contact
- Navigation
- Public release readiness

Brand does not own creator-private profile details or module internals.

### Creators

Creators own independent creator sites.

A creator can have:

- Home
- Profile
- Works
- Contact
- Personal modules

For example, Chikage owns a TRPG area as a creator site feature. TRPG is not a
global brand module.

### System

System owns operational infrastructure:

- Backup
- Import
- Export
- Build
- Publish
- Settings
- Diagnostics
- Activity
- Migration
- Git status and controlled Git operations

### Validation Engine

Validation must be shared by Studio, Browser Admin, Build, and future clients.

Validation must not live only in a form component.

### Build Engine

Build turns validated canonical data into public artifacts.

Build must be deterministic, reportable, and diagnosable.

### Public Generator

Public Generator produces:

- Public JSON
- Static HTML/CSS/JS
- SEO metadata
- sitemap
- robots
- manifest
- preview artifacts

It must not depend on a browser-only runtime.

## Client Roles

### Desktop Studio

Desktop Studio can access:

- File system
- Git
- Build
- Backup
- Rollback
- Preview
- Publish

It is the primary production environment.

### Browser Admin

Browser Admin is a reduced client for:

- Emergency correction
- Light editing
- PWA-compatible workflows
- Read and review

It is not the long-term replacement for Desktop Studio.

### Mobile/PWA

Mobile/PWA can support:

- Notes
- Profile
- Draft
- Preview
- Notifications

Mobile/PWA must not own:

- Git
- Build
- Publish
- Reset
- Unbounded filesystem writes

## Dependency Direction

Allowed:

```text
UI -> shared validation -> data contract
Studio bridge -> filesystem
Build -> public generator -> dist
Preview -> shared render data
```

Forbidden:

```text
Public -> Studio
Public -> localStorage editor state
Validation -> DOM
Data schema -> screen-specific labels
Plugin -> Module internals without contract
Browser Admin -> arbitrary shell
```

## Architecture Rule

Every new capability must declare:

- Data contract.
- Validation.
- Backup behavior.
- Build behavior.
- Public mapping.
- Migration behavior.
- Diagnostics.
- Client support level.

