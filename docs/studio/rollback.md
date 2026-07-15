# Studio Rollback

## Write Rollback

Safe writes must preserve the original file before replacement.

Recommended backup layout:

```text
backup/
└── studio/
    └── YYYY-MM-DD/
        └── HHmmss/
            ├── manifest.json
            └── files/
```

Manifest fields:

- `createdAt`
- `operation`
- `files`
- `checksums`
- `appVersion`
- `schemaVersion`
- `projectRootHash`
- `gitBranch`
- `gitSha`
- `result`

## Failure Handling

If parse, validation, temp write, backup, rename, readback, or checksum fails:

- Keep the canonical file unchanged whenever replacement has not happened.
- Remove temp files.
- Restore from backup when replacement happened but readback failed.
- Report a visible error.
- Record the failure in Activity Log when available.

## Git Rollback

Phase 0 does not automate Git rollback. Recovery is through backup files and normal Git history.
