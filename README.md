# RELMUA

RELMUAの作品、公開ツール、制作ノートをまとめるPublicサイトです。TerminalはRELMUAを支えるCreative Platformとして扱います。

## Current Status

現在は v1.0 です。主要モジュール、Admin管理、Public Export、Backup、GitHub Pages公開に加え、TRPG SchedulerのSupabase連携とDiscord通知まで利用できます。

RELMUAは用途ごとに保存先と実行環境を分けています。

- Admin管理データはブラウザの`localStorage`で管理します。
- Publicコンテンツは`apps/web/`配下の固定JSONと静的ファイルとしてGitHub Pagesへ公開します。
- TRPG SchedulerはSupabase Auth / PostgreSQL / RPCを利用します。Discord OAuthでログインし、参加卓・候補日・回答・準備項目・通知設定などをサーバー側へ保存します。
- Guest参加用credentialはブラウザの`localStorage`へ保持し、サーバー側ではGuest tokenのハッシュだけを保存します。
- Discord連携はSupabase Edge FunctionsからDiscord APIを利用します。

重要なAdmin管理データは定期的にBackup Exportしてください。TRPG SchedulerのサーバーデータとAdmin Backupは別系統です。

製品バージョンの正本は`package.json`の`1.0.0`です。Public Exportと
新しいBackupの`app`名は`RELMUA Terminal`へ統一しています。旧
`MIRA Terminal` Backupは互換入力として引き続き読み込めます。

`apps/studio/src-tauri/tauri.conf.json`の`0.1.0`はDesktop実行環境単体の
開発バージョンであり、RELMUA製品全体のリリース番号とは分けて扱います。

## Architecture

| 領域 | 実行・保存 | 主な役割 |
|---|---|---|
| Admin | Browser / localStorage | 制作データの登録・編集・Backup・Public Export |
| Public | GitHub Pages | Home、Projects、Notes、TRPG公開情報などの静的配信 |
| TRPG Scheduler | Supabase Auth + PostgreSQL + RPC | Discordログイン、卓参加、日程回答、Session、準備管理 |
| Discord Interactions | Supabase Edge Functions | Discordコマンド・ボタン操作を署名検証後に処理 |
| Discord Notifications | Supabase Edge Functions + delivery queue | 日程・再回答・前日・当日・準備リマインドDM |

Publicブラウザへ渡すSupabase keyはpublishable keyのみです。`SUPABASE_SERVICE_ROLE_KEY`、Discord Bot Token、Discord Public Key、通知dispatcher secretはEdge Function側のsecretとして扱い、Public buildへ含めません。

Discord InteractionはEd25519署名に加え、timestampの鮮度を確認して古い署名済みリクエストの再送を拒否します。

## Public Modules

- Home
- Projects
- Tools（公開データがあるときだけPublic導線を表示）
- Notes
- About
- Contact
- Creators
- Creator互換入口
- TRPG Scenario Library
- TRPG Scenario Picker
- TRPG House Rules
- TRPG Scheduler / My Sessions
- Light / Darkテーマ切り替え
- スマートフォン対応
- OGP / Twitter Card

TRPG Scenario Libraryでは、キーワード・作者・ひらがな・システム・人数・時間・年齢区分・タグによる検索、並び替え、お気に入り、詳細表示、検索条件URL共有を利用できます。

TRPG Scenario Pickerでは、人数・確保できる時間・システム・R18可否を
指定し、条件に一致するシナリオから3件を選べます。共有URLには抽選seedを
含めるため、同じ候補を再現できます。時間指定時は上限時間が入力済みの
シナリオだけを対象にします。

## Admin Modules

- Admin Hub
- Creators管理
- TRPG Scenario管理
- TRPG House Rules管理
- Profile / Links管理
- Game管理
- Tools管理
- Notes管理
- Public Export
- Backup Export / Import

Adminはローカル運用専用です。GitHub Pagesでは`apps/web/`だけを`dist/`へコピーするため、`apps/admin/`は公開対象に含まれません。

## AdminとPublicの役割

| 領域 | 役割 |
|---|---|
| Admin | localStorage上の管理データを登録・編集・並び替え・Backupする |
| Public Export | public状態の公開可能な項目だけを固定名JSONとして出力する |
| Public | apps/web/.../data/ のPublic JSONを読み込み、閲覧・検索機能を提供する |
| Backup | draft / private / publicを含む管理データを保存・復元する |

Backup JSONは管理用情報を含むため、`apps/web/`や`dist/`へ配置しません。Public Export JSONと混同しないでください。

## Public JSON

| モジュール | 配置先 |
|---|---|
| Creators | apps/web/data/public-creators.json |
| Profile / Links | apps/web/data/public-profile.json |
| TRPG Scenario | apps/web/data/creators/chikage/trpg/public-scenarios.json |
| TRPG House Rules | apps/web/data/creators/chikage/trpg/house-rules.json |
| Projects | apps/web/game/data/public-games.json |
| Tools | apps/web/tools/data/public-tools.json |
| Notes | apps/web/notes/data/public-notes.json |

詳しい更新方法は [Publicデータ更新手順](./docs/public-data-update.md) を参照してください。

## TRPG年齢区分

TRPG Scenarioの年齢区分は次の2択です。

| 内部値 | 表示 |
|---|---|
| all | 全年齢 |
| r18 | R18 |

18歳未満が閲覧・参加できるかを年齢区分で示し、細かな注意要素はタグで扱います。

例：グロ注意、暴力描写、欠損、倫理観、性的描写、人を選ぶ

旧データのR18G、R-18G、adult、hardなどは読込時にR18へ統合します。空欄や不正値は全年齢として扱います。

## Local Development

ローカルサーバーをリポジトリのルートで起動します。

~~~bash
dotnet serve -p 8000
~~~

- Admin Hub: http://localhost:8000/apps/admin/
- Public Home: http://localhost:8000/apps/web/
- Projects: http://localhost:8000/apps/web/projects/
- Creators: http://localhost:8000/apps/web/creators/
- TRPG Library: http://localhost:8000/apps/web/creators/chikage/trpg/
- TRPG Scenario Picker: http://localhost:8000/apps/web/creators/chikage/trpg/picker/
- TRPG Scheduler: http://localhost:8000/apps/web/creators/chikage/trpg/v2/

HTMLを直接開かず、HTTPサーバー経由で確認してください。

TRPG Schedulerを有効にする場合は`.env.example`を参考に、ローカル環境へ次を設定します。

~~~text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
~~~

service role keyやDiscord secretをPublic build用の`.env`へ置かないでください。

## Development Checks

Node.js 20以上で実行します。

~~~bash
npm run check
npm run build:public
~~~

個別実行：

~~~bash
npm run check:syntax
npm test
~~~

Publicビルドは`dist/`を毎回作り直し、`apps/web/`だけをコピーします。Admin、Backup JSON、シンボリックリンクは公開しません。

## GitHub Pages

1. Adminで公開データを編集する
2. Public Exportを実行する
3. 固定名JSONを所定の`apps/web/.../data/`へ配置する
4. `npm run check`と`npm run build:public`を実行する
5. Pull Requestを作成し、GitHub Actionsのcheckを通す
6. `main`へmergeする
7. GitHub ActionsがProduction用Supabase public configを生成して`dist/`をGitHub Pagesへデプロイする

Workflow: `.github/workflows/publish-pages.yml`

Pull Requestではsecretを使わずにcheckとPublic build検証だけを実行します。Production deploymentは`main`への反映後または手動実行時だけ行います。

GitHub Pagesの公開対象は`dist/`だけです。Adminは公開されません。

## Security Notes

- `.env`、`.env.local`、Backup、`dist/`はGit管理対象外です。
- Public JSONはallowlistで検査し、Admin専用フィールドやBackup JSONをPublic buildへ含めません。
- Supabase Browser SDKは完全なバージョン番号で固定し、依存更新を明示的に行います。
- Guest tokenはURL共有用データへ含めず、DBにはハッシュだけを保存します。
- Discord Interactionは送信者IDをinteraction本体から取得し、ユーザー入力によるDiscord ID偽装を許可しません。
- Edge Functionのservice-role RPCは必要な関数だけ`service_role`へ`GRANT EXECUTE`します。

## Public Data Policy

Public側では、管理用メモ・保存場所・作成日時・更新日時を公開しません。外部作品の画像・動画埋め込みや、BOOTH等の商品説明文の丸コピーを前提にしません。

扱うもの：

- 自分で入力した概要・注意事項
- 自分で付けたタグ
- 配布ページへの外部リンク
- 自作のOGP画像

## Documentation

- [v1.0運用メモ](./docs/v1.0-release.md)
- [Publicデータ更新手順](./docs/public-data-update.md)
- [TRPG Public JSON Schema](./docs/public-schema.md)
- [仕様概要](./docs/specification.md)

## Directory Overview

~~~text
apps/
├ admin/   # localStorage管理画面。Pages非公開
└ web/     # PublicページとPublic JSON
supabase/
├ functions/   # Discord Interaction / notification Edge Functions
└ migrations/  # Scheduler DB migrations
docs/
scripts/
tests/
dist/      # build:publicで生成。Git管理対象外
~~~

## Commit Examples

~~~bash
git commit -m "chore(web): update public data"
git commit -m "feat(admin-trpg): add ..."
git commit -m "feat(web-trpg): add ..."
git commit -m "docs: update ..."
~~~
