# Studio Development

## Development Requirements

Development currently needs:

- Git.
- Rust toolchain and Cargo for Tauri.
- Node or an embedded runtime strategy for `scripts/build-public.mjs`.
- Windows WebView2 runtime.

This local QA environment did not expose `cargo`, `rustc`, `node`, or `npm` on PATH. Existing repo verification used the bundled Codex Node runtime.

## Phase 0 Commands

Existing repo checks:

```text
git diff --check
node scripts/check-syntax.mjs
node --test --test-isolation=none
node scripts/build-public.mjs
```

Studio checks when tooling is available:

```text
cargo check --manifest-path apps/studio/src-tauri/Cargo.toml
cargo tauri dev
cargo tauri build
```

## Build Command Policy

Studio may run only the fixed public build:

```text
node scripts/build-public.mjs
```

No user-provided command string may be executed.
