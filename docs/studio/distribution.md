# Studio Distribution

## Windows Operation Targets

Studio should support:

- No administrator permission for ordinary use.
- Portable use where possible.
- Installer build when signing/update flow is ready.
- Paths with Japanese text.
- Paths with spaces.
- OneDrive folders.
- USB folders.
- Offline editing and preview preparation.
- Multiple PCs with explicit backup and Git review.

## Runtime Dependencies

End users should not need Rust. End users should ideally not need a separately installed Node runtime.

Build execution options:

| Option | Strength | Weakness |
| --- | --- | --- |
| Require installed Node | Simple | Fragile on school PCs |
| Bundle Node | Compatible with existing script | Larger app, security/update responsibility |
| Reimplement build in Rust | No Node runtime | More migration work |
| Keep build external in Phase 0 | Low risk | Not a complete Studio workflow |

Phase 0 records the tradeoff. Later phases should decide whether to bundle Node or reimplement the static build in Rust.
