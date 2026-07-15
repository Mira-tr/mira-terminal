# Studio Public JSON Mapping

One module has one canonical source file. Studio must not write a second authority.

| Module | Source file | Public URL | Build output | Preview URL |
| --- | --- | --- | --- | --- |
| Brand Home | `apps/web/data/public-home.json` | `/` | `dist/data/public-home.json` | `/` |
| Projects | `apps/web/game/data/public-games.json` | `/projects/` | `dist/game/data/public-games.json` | `/projects/` |
| Tools | `apps/web/tools/data/public-tools.json` | `/tools/` | `dist/tools/data/public-tools.json` | `/tools/` |
| Notes | `apps/web/notes/data/public-notes.json` | `/notes/` | `dist/notes/data/public-notes.json` | `/notes/` |
| Creators | `apps/web/data/public-creators.json` | `/creators/` | `dist/data/public-creators.json` | `/creators/` |
| Profile | `apps/web/data/public-profile.json` | `/creators/chikage/` | `dist/data/public-profile.json` | `/creators/chikage/` |
| TRPG | `apps/web/data/creators/chikage/trpg/public-scenarios.json` | `/creators/chikage/trpg/` | `dist/data/creators/chikage/trpg/public-scenarios.json` | `/creators/chikage/trpg/` |
| House Rules | `apps/web/data/creators/chikage/trpg/house-rules.json` | `/creators/chikage/trpg/rules/` | `dist/data/creators/chikage/trpg/house-rules.json` | `/creators/chikage/trpg/rules/` |

The code authority for this table is `apps/studio/src/shared/studioPublicJsonRegistry.js`.
