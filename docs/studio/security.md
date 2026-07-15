# Studio Security

## Phase 0 Rules

- No arbitrary shell command execution.
- No arbitrary UI-selected write path.
- No writes outside the selected project root.
- No writes through symlinks.
- No production file replace before JSON parse and validation.
- No overwrite without backup.
- No automatic commit.
- No automatic push.
- No reset, checkout, force, or branch deletion.
- No tokens, credentials, environment variables, or remote URLs in Public JSON or build manifest.

## Tauri Capability Scope

Phase 0 keeps Tauri capability narrow:

- `core:default` only.
- No shell plugin.
- No broad filesystem plugin permissions.
- File and process access must go through explicit Rust commands.

## Path Safety

Every backend file command must:

1. Canonicalize project root.
2. Resolve target relative to the root.
3. Reject root escape.
4. Reject symlink writes.
5. Use fixed registry paths where possible.

## Logs

Activity Logs should record operation metadata, not secrets. Do not log tokens, credential paths, Git remote URLs with credentials, or full environment dumps.
