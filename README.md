# RELMUA

RELMUAの作品、公開ツール、制作ノートをまとめるPublicサイトです。TerminalはRELMUAを支えるCreative Platformとして扱います。

## Current Status

現在は v1.0 です。主要モジュール、Admin管理、Public Export、Backup、GitHub Pages公開まで一通り利用できます。

データはブラウザの localStorage で管理します。サーバーDB・ログイン・クラウド同期はありません。重要な管理データは定期的にBackup Exportしてください。

## Public Modules

- Home
- Projects
- Tools
- Notes
- About
- Contact
- Creator
- TRPG Scenario Library
- TRPG House Rules
- Light / Darkテーマ切り替え
- スマートフォン対応
- OGP / Twitter Card

TRPG Scenario Libraryでは、キーワード・作者・ひらがな・システム・人数・時間・年齢区分・タグによる検索、並び替え、お気に入り、詳細表示、検索条件URL共有を利用できます。

## Admin Modules

- Admin Hub
- TRPG Scenario管理
- TRPG House Rules管理
- Profile / Links管理
- Game管理
- Tools管理
- Notes管理
- Public Export
- Backup Export / Import

Adminはローカル運用専用です。GitHub Pagesでは apps/web/ だけを dist/ へコピーするため、apps/admin/ は公開対象に含まれません。

## AdminとPublicの役割

| 領域 | 役割 |
|---|---|
| Admin | localStorage上の管理データを登録・編集・並び替え・Backupする |
| Public Export | public状態の公開可能な項目だけを固定名JSONとして出力する |
| Public | apps/web/.../data/ のPublic JSONを読み込み、閲覧・検索機能を提供する |
| Backup | draft / private / publicを含む管理データを保存・復元する |

Backup JSONは管理用情報を含むため、apps/web/ や dist/ へ配置しません。Public Export JSONと混同しないでください。

## Public JSON

| モジュール | 配置先 |
|---|---|
| Profile / Links | apps/web/data/public-profile.json |
| TRPG Scenario | apps/web/trpg/data/public-scenarios.json |
| TRPG House Rules | apps/web/trpg/rules/data/house-rules.json |
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
- TRPG Library: http://localhost:8000/apps/web/trpg/

HTMLを直接開かず、HTTPサーバー経由で確認してください。

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

Publicビルドはdist/を毎回作り直し、apps/web/だけをコピーします。Admin、Backup JSON、シンボリックリンクは公開しません。

## GitHub Pages

1. Adminで公開データを編集する
2. Public Exportを実行する
3. 固定名JSONを所定のapps/web/.../data/へ配置する
4. npm run check と npm run build:public を実行する
5. Public表示を確認してmainへpushする
6. GitHub Actionsがdist/をGitHub Pagesへデプロイする

Workflow: .github/workflows/deploy-pages.yml

GitHub Pagesの公開対象はdist/だけです。Adminは公開されません。

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
