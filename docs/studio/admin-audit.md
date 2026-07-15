# Current Admin Asset Audit

| Area | Current dependency | Studio Phase 0 classification | Direction |
| --- | --- | --- | --- |
| Admin HTML | Static pages | Reusable with light adaptation | Keep Browser Admin, later load selected views in Studio shell |
| Admin CSS | Static CSS | Reusable | Share visual density; avoid duplicating editors |
| Admin Shell | Browser DOM + localStorage theme | Light adaptation | Keep browser behavior; Studio can reuse shell conventions |
| Terminal | Registry-driven links | Reusable | Keep as Production OS navigation model |
| Dashboard | localStorage summaries | Browser/localStorage dependency | Later move status reads to Studio backend |
| Brand Editors | localStorage + download export | Browser/localStorage dependency | Later migrate write path to canonical JSON |
| Creator Editors | localStorage + download export | Browser/localStorage dependency | Later migrate with Creator permission model |
| TRPG | localStorage + public export | Browser/localStorage dependency | Preserve behavior; Studio writes canonical Creator TRPG JSON later |
| House Rules | localStorage + public export | Browser/localStorage dependency | Preserve behavior; Studio writes canonical Creator TRPG JSON later |
| Backup | Browser download | Tauri backend needed | Backend creates backup before write |
| Import | Browser file input | Tauri backend needed | Backend validates and writes with rollback |
| Export | Browser download | Tauri backend needed | Backend places Public JSON directly |
| Settings | Read-only contracts | Reusable | Share with Studio status |
| Publish | Build manifest fetch | Tauri backend needed | Backend runs build and reads manifest |
| Activity Log | localStorage | Light adaptation | Later write file-backed activity log |
| Validation | Shared JS rules | Shared | Keep rules in shared modules where possible |
| Build Manifest | `dist/build-manifest.json` | Reusable | Backend verifies after fixed build |
| Registry | JS definitions | Shared | Keep single mapping definitions |
| localStorage | Browser storage | Migration source | Keep until editor migration |
| Public JSON | Canonical public files | File-system authority | Studio must read/write one source per module |
| `scripts/build-public.mjs` | Node script | Backend process boundary | Run fixed command only |

Deprecated candidates:

- Download-only Public Export as the final Studio workflow.
- Permanent localStorage authority after editor migration.
- Any duplicate Public JSON authority.
