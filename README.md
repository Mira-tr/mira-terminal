# RELMUA

RELMUAは、少数のCreatorがそれぞれの活動領域を持てるCreative Platformです。このrepositoryには、公開サイト、RELMUA編集室、千景のTRPG機能、Supabase backendをまとめています。

## Current architecture

| 領域 | 正本 / 実行環境 | 主な役割 |
|---|---|---|
| RELMUA編集室 | Supabase CMS + `/admin/` | Brand / Creator / TRPG公開データの編集、検証、公開 |
| Public | `apps/web/` + GitHub Pages | RELMUA、Creator、Projects、Tools、Notes、TRPGの公開表示 |
| Publication | Supabase queue + GitHub Actions | Public snapshotの検証、build、commit、Pages deploy |
| TRPG Scheduler | Supabase Auth + PostgreSQL + RPC | 卓、参加者、候補日、回答、Session、準備、通知 |
| Discord | Supabase Edge Functions | Discord OAuth / Interaction / 通知 |

Adminの公開用データはSupabase CMSを正本とします。ブラウザ保存は入力補助・fallbackとして扱い、公開時はAdminが生成したpublic-safe snapshotのみをPublicへ反映します。

## Public surfaces

- RELMUA Home / About / Contact
- Projects / Tools / Notes
- Creators
- 千景 Home / Profile / Works / Contact
- 千景 TRPG Overview
- Scheduler / Calendar
- Scenario Library / Scenario Picker
- House Rules

古い互換URL、旧Studio/Desktop、旧Creator/TRPG入口は維持しません。現在の正式導線だけをrepositoryに残します。

## Admin

RELMUA編集室は `/admin/` に集約しています。

- Brand / Home / About / Contact / Navigation
- Creators / 千景Creator Workspace
- Projects / Tools / Notes
- TRPG Scenario / House Rules
- Database / Validation / Backup / Import / Export / Publish / Activity Log

Admin専用情報はPublicへ出しません。特に `memo`、`status`、`createdAt`、`updatedAt` はPublic snapshotから除外します。

## Publishing

通常の公開操作はAdminだけで完結します。

1. Adminで編集して保存する
2. Adminの「公開する」から公開要求を送る
3. Supabase publication queueへpublic-safe snapshotを登録する
4. GitHub Actions workerが要求を取得する
5. snapshotを検証する
6. `npm run check` と `npm run build:public` を実行する
7. Public JSONをmainへ反映する
8. GitHub Pagesへdeployする
9. Adminの公開履歴を`published`へ更新する

Workerは通常5分ごとにqueueを確認します。GitHubやJSONを手動操作する運用は通常フローではありません。

## Public snapshot targets

自動公開では、AdminとPublicの契約で定義された9つの動的Public targetを一括で検証します。Public JSONはallowlist方式で、Admin専用フィールドや危険なURLを公開しません。

主要データ例:

- `apps/web/data/public-home.json`
- `apps/web/data/public-brand.json`
- `apps/web/data/public-creators.json`
- `apps/web/data/public-profile.json`
- `apps/web/game/data/public-games.json`
- `apps/web/tools/data/public-tools.json`
- `apps/web/notes/data/public-notes.json`
- `apps/web/data/creators/chikage/trpg/public-scenarios.json`
- `apps/web/data/creators/chikage/trpg/house-rules.json`

## TRPG

千景のTRPG機能は `/creators/chikage/trpg/` 配下を正式導線とします。

- Overview: `/creators/chikage/trpg/`
- Scheduler: `/creators/chikage/trpg/scheduler/`
- Calendar: `/creators/chikage/trpg/calendar/`
- Scenario Library: `/creators/chikage/trpg/scenarios/`
- Scenario Picker: `/creators/chikage/trpg/picker/`
- House Rules: `/creators/chikage/trpg/rules/`

Scenario Libraryは千景の所持シナリオを確認・共有する蔵書です。Schedulerとは独立して扱います。

## Local development

Node.js 20以上を使用します。

```bash
npm run serve
npm run check
npm run build:public
```

主なローカル入口:

- Admin: `http://localhost:8000/apps/admin/`
- Public: `http://localhost:8000/apps/web/`
- 千景: `http://localhost:8000/apps/web/creators/chikage/`
- TRPG: `http://localhost:8000/apps/web/creators/chikage/trpg/`
- Scheduler: `http://localhost:8000/apps/web/creators/chikage/trpg/scheduler/`

Public buildは`dist/`を作り直し、Public siteと隔離された`/admin/`管理ルートをPages artifactへ組み立てます。

## Security

- Public buildへservice role keyやDiscord secretを含めない
- Public browserへ渡すSupabase keyはpublishable keyのみ
- Public JSONはallowlistで検証する
- 外部URLは`http:` / `https:`のみ許可する
- Backup / Admin-only metadataをPublicへ混ぜない
- user-controlled contentへ`innerHTML`を使わない
- Guest tokenは共有URLへ含めず、DBではhashのみ保持する

## Repository

```text
apps/
├ admin/       # RELMUA編集室
└ web/         # Public site
supabase/
├ functions/   # CMS publication / Discord / notifications
└ migrations/  # CMS / Scheduler database
scripts/       # build / validation / publication helpers
tests/         # current contracts and regression tests
docs/          # current specifications and operation notes
```

変更後は必ず次を通します。

```bash
npm run check
npm run build:public
```
