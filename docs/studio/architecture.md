# RELMUA Studio Architecture

RELMUA Studio is a desktop production application for RELMUA operations. It is not a replacement for the browser Admin in Phase 0.

## Technology Choice

| Option | Strength | Weakness | Migration Cost | Decision |
| --- | --- | --- | --- | --- |
| Tauri | Small app size, fast startup, reuses HTML/CSS/JS, Rust-side file access, narrow capabilities | Requires Rust toolchain for development, Node/build strategy must be designed | Medium | Adopt as first candidate |
| Electron | Strong Node integration, easy process and Git access | Large runtime, slower startup, higher update/distribution weight | Medium | Do not adopt for Phase 0 |
| Browser Admin | Already works, no install | Cannot write canonical files directly, cannot run build/Git/file watch safely | Low short term, high long term | Keep as compatibility surface |

Phase 0 adopts Tauri because RELMUA Studio needs filesystem, build, backup, preview, and Git read-only access without giving the UI arbitrary shell power.

## Responsibility Split

Frontend:
- UI, forms, navigation, preview display, confirmation, validation display, Activity Log display.

Tauri backend:
- Project root validation, file read/write, atomic replace, backup creation, fixed build command, Git read-only status, process execution, file watching, path validation.

Shared:
- JSON schema, registry, validation rules, Public JSON mapping, export definitions, operation metadata.

## Phase 0 Scope

Phase 0 adds:
- `apps/studio/` shell.
- Tauri command boundary.
- Project root contract.
- Public JSON registry.
- Safe Write PoC for one JSON target.
- Build command boundary.
- Git read-only command boundary.
- Security and rollback documentation.

Phase 0 does not:
- Remove or replace Browser Admin.
- Migrate editors.
- Change localStorage keys.
- Change Public JSON structure.
- Add automatic commit or push.
