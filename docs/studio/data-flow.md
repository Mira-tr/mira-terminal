# Studio Data Flow

## Current Browser Admin

Browser Admin remains compatible:

1. Edit in localStorage.
2. Backup/Import through browser downloads and file selection.
3. Public Export downloads JSON.
4. Human places files or uses repo workflow.
5. `scripts/build-public.mjs` builds `dist/`.

## Studio Target Flow

Studio target flow:

1. Select and validate project root.
2. Read canonical Public JSON.
3. Validate data and schema.
4. Create backup.
5. Write temp file.
6. Atomic replace.
7. Read back and checksum.
8. Run fixed build command.
9. Preview.
10. Review Git diff.
11. Later phases may support commit and push with explicit confirmation.

## Storage Recommendation

Recommended direction is Hybrid, not blind replacement:

- Studio internal edit state for draft workflow and recovery.
- Public JSON as canonical public source.
- Backup before every write.
- Browser Admin localStorage retained until editor migration is complete.

This preserves existing compatibility while making Git diff and human manual editing possible.
