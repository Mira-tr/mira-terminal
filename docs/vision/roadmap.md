# RELMUA v2 Roadmap

This roadmap is architectural, not a release promise.

## Phase 0: Constitution

Goal:

Define RELMUA as a Brand OS.

Deliverables:

- Philosophy.
- Architecture.
- Responsibility boundaries.
- Data contract.
- Module system design.
- Plugin system design.
- Studio role.
- Preview engine role.
- Public generator role.

## Phase 1: Studio Foundation

Goal:

Make Desktop Studio run as a real app without replacing Browser Admin.

Deliverables:

- Tauri runtime verification.
- Project Root selection.
- Project Root persistence.
- Public JSON read.
- Git read-only status.
- Safe Write in temp/project-safe path.
- Build command execution.
- Build manifest read.
- Activity foundation.

## Phase 2: Shared Contracts

Goal:

Move validation and mapping into reusable shared modules.

Deliverables:

- Shared validation engine.
- Shared module registry.
- Shared public mapping.
- Shared diagnostics model.
- Shared backup manifest model.

## Phase 3: Preview Engine

Goal:

Preview changes without full Public build.

Deliverables:

- Preview data adapter.
- Preview renderer boundary.
- Home preview.
- Project preview.
- Creator preview.
- TRPG preview.
- Notes preview.
- Theme preview.

## Phase 4: Theme System

Goal:

Make brand presentation configurable without hard-coding page redesigns.

Deliverables:

- Theme data contract.
- Theme editor.
- Token validation.
- Preview integration.
- Public generation.

## Phase 5: Diagnostics and Health

Goal:

Make publish readiness visible at startup.

Deliverables:

- Project Health Dashboard.
- Diagnostics Center.
- Broken link scan.
- Image scan.
- SEO scan.
- Accessibility scan.
- Empty content scan.
- Duplicate slug scan.
- Build and Git checks.

## Phase 6: Migration Engine

Goal:

Let Studio migrate schemas safely.

Deliverables:

- Migration registry.
- Dry-run.
- Backup before migration.
- Migration report.
- Rollback instructions.
- Schema version display.

## Phase 7: Publish OS

Goal:

Make release preparation calm and repeatable.

Deliverables:

- Publish checklist.
- Build diff.
- Preview URL.
- Release notes.
- Git guardrails.
- Rollback package.

## Phase 8: PWA and Mobile Companion

Goal:

Support light daily work without giving mobile unsafe powers.

Deliverables:

- Notes draft.
- Profile edits.
- Preview.
- Notifications.
- Read-only diagnostics.

Forbidden on mobile:

- Git.
- Build.
- Publish.
- Reset.

## Phase 9: Plugin Ecosystem

Goal:

Allow integrations without polluting core data.

Deliverables:

- Plugin registry.
- Permission model.
- Activity logging.
- External connector boundaries.
- AI assistant plugin boundary.

