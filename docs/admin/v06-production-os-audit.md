# RELMUA v0.6 Admin Production OS Phase 0 Audit

This audit freezes the starting point and classifies Admin areas before the v0.6 Production OS implementation.

## Classification Table

| Target | Classification | v0.6 action |
| --- | --- | --- |
| Terminal | 部分実装 | Convert top to today / workspace / attention / recent actions. |
| Dashboard | 部分実装 | Keep four-entry Hub and readable daily status. |
| Brand Home | 完全実装済み | Keep existing Home editor and Public Export. |
| Projects | 完全実装済み | Keep existing Game Admin as Projects entry. |
| Tools | 完全実装済み | Keep editor/export/backup. |
| Notes | 完全実装済み | Keep editor/export/backup. |
| Creators | 完全実装済み | Keep creator registry/export/backup. |
| Brand About | Guide案内のみ | Track from System Settings; dedicated editor deferred. |
| Brand Contact | Guide案内のみ | Track from System Settings; dedicated editor deferred. |
| 千景 Profile | 完全実装済み | Keep existing Profile editor. |
| 千景 Works | Registryのみ | Planned creator-specific editor; Brand Projects remain separate. |
| 千景 Contact | Registryのみ | Planned creator-specific editor. |
| 千景 TRPG | 完全実装済み | Keep Scenario Library under Chikage workspace. |
| House Rules | 完全実装済み | Keep House Rules under Chikage TRPG. |
| 朝霧 Home | Registryのみ | Creator registry entry only. |
| 朝霧 Profile | 部分実装 | Managed through Creator registry. |
| 朝霧 Works | Registryのみ | Planned, not linked as active editor. |
| 朝霧 Contact | Registryのみ | Planned, not linked as active editor. |
| System Guide | Guide案内のみ | Add real System Guide screen. |
| Backup | 部分実装 | Add System Backup screen while preserving per-module backups. |
| Import | 部分実装 | Add System Import preview/confirm flow. |
| Export | 部分実装 | Add System Export target review. |
| Settings | Registryのみ | Add read-only System Settings screen. |
| Publish | Registryのみ | Add Build Manifest-based Publish preflight. |
| Activity Log | Registryのみ | Add local Activity Log screen and storage. |

## Responsibility Boundary

- Brand owns public RELMUA site structure and shared public content.
- Creator owns creator site information and personal features.
- Chikage owns TRPG.
- Asagiri does not show TRPG.
- System owns safety, validation, build, and publish-prep operations.

## Data Boundary

- Existing Public JSON structure remains unchanged.
- Existing localStorage keys remain unchanged.
- Existing Backup / Import / Export formats remain unchanged.
- v0.6 adds only `mira_terminal_activity_log` for Production OS activity.
- System Backup is additive and does not replace existing module backup formats.

## Remaining Deferred Work

- Dedicated Brand About editor.
- Dedicated Brand Contact editor.
- Creator-specific Works editor.
- Creator-specific Contact editor.
- Full browser QA with real keyboard and focus checks.
