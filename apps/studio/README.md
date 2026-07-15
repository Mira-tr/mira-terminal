# RELMUA Studio

RELMUA Studio is the planned desktop production desk for RELMUA.

Phase 0 is not a Browser Admin replacement. It adds a safe foundation for:

- Project root validation.
- Project status.
- Public JSON read.
- Safe Write PoC.
- Backup before write.
- Atomic replace.
- Fixed build command.
- Git read-only status.
- Security and rollback planning.

## Browser Admin Compatibility

The existing Browser Admin remains the supported editing surface during Phase 0.

Studio must preserve:

- localStorage keys.
- Backup and Import formats.
- Public Export formats.
- Public JSON structure.
- Build output boundaries.
- Registry contracts.

## Tauri Development

This folder contains a minimal Tauri scaffold under `src-tauri/`.

Tauri commands are intentionally narrow:

- Validate project root.
- Read known Public JSON files.
- Safe-write `public-notes.json` as the Phase 0 PoC target.
- Run the fixed public build script.
- Read Git status only.

No automatic commit, push, reset, checkout, branch deletion, or arbitrary command execution is implemented in Phase 0.
