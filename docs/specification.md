# RELMUA / Terminal Specification

## Version

v1.0

静的HTML / CSS / JavaScriptで構成する、個人用の管理・公開プラットフォームです。

## Modules

### Public

- Home
- About / Profile / Links
- TRPG Scenario Library
- TRPG House Rules
- Projects
- Tools
- Notes
- Light / Darkテーマ
- OGP / Twitter Card
- レスポンシブ表示

### Admin

- Admin Hub
- TRPG Scenario
- TRPG House Rules
- Profile / Links
- Game
- Tools
- Notes
- Public Export
- Backup Export / Import

## Responsibility

### Admin

- localStorage上の管理データを登録・編集・削除・並び替える
- 非公開状態、管理用メモ、保存場所を保持する
- Public ExportとBackupを分ける

### Public Export

- public状態のレコードだけを出力する
- 管理専用項目を除外する
- 固定ファイル名を使う
- TRPG ratingをall / r18へ正規化する

### Public

- apps/web/.../data/のJSONをfetchする
- user-controlled textはcreateElement / textContent / replaceChildrenで描画する
- AdminのlocalStorageを参照しない
- 管理専用情報を表示しない

### Backup

- 管理データの保存・復元に使う
- 非公開状態と管理情報を含む
- 日付付きファイル名を使う
- apps/web/とdist/へ配置しない

## Storage

AdminデータはブラウザのlocalStorageへ保存します。

- サーバーDBなし
- ログインなし
- クラウド同期なし
- 端末間の自動移行なし
- 定期Backupを推奨

Publicデータはリポジトリ内の固定JSONです。

## TRPG Scenario

### Admin機能

登録・編集・削除、作者候補、タグ管理、状態管理、保存場所管理、検索・絞り込み、公開品質警告、Public Export、Backup Export / Import。

### Public機能

キーワード・作者・ひらがな検索、システム・人数・時間・年齢区分・タグ絞り込み、並び替え、適用中条件表示、お気に入り、詳細モーダル、検索条件URL共有、もっと見る。

### Status

| 値 | 意味 |
|---|---|
| draft | 未整理 |
| ready | 整理済み |
| public | 公開 |
| private | 非公開 |

### Rating

| 値 | 意味 |
|---|---|
| all | 全年齢 |
| r18 | R18 |

旧値のR18G、R-18G、adult、hard等はR18へ統合します。空欄・不正値は全年齢です。細かな注意要素はタグで管理します。

### Scenario Data

~~~text
id, title, kana, author, system,
playersRaw, playersMin, playersMax,
timeRaw, timeMin, timeMax,
loss, rating, scenarioType, series,
summary, notes, tags, url,
storageLocations, storageNote, memo,
status, createdAt, updatedAt
~~~

Public Exportでは管理項目とstatus、日時を除外します。

## TRPG House Rules

### Admin機能

System ID、Label、Public Title、Version、Description、Statusを管理します。
Sectionはorder、category、title、status、bodyを管理し、長文編集向けに折りたたみ式で編集します。

### Public機能

公開system / sectionだけを読み込み、文書冒頭にtitle / label / version / descriptionを表示します。
セクションはカテゴリ別に整理し、カテゴリ目次とdetails / summaryによる折りたたみ表示で閲覧します。

### House Rules Data

~~~text
system: id, label, title, version, description, status, sections
section: id, order, category, title, status, body
~~~

Backupではdraft / public / privateと管理日時を保持します。
Public Exportではstatus、createdAt、updatedAt、private memoなどの管理項目を除外します。
旧データにcategoryやorderがない場合は、未分類・配列順として正規化します。

## Public JSON

| モジュール | 配置先 |
|---|---|
| Creators | apps/web/data/public-creators.json |
| Profile | apps/web/data/public-profile.json |
| TRPG Scenario | apps/web/trpg/data/public-scenarios.json |
| House Rules | apps/web/trpg/rules/data/house-rules.json |
| Projects | apps/web/game/data/public-games.json |
| Tools | apps/web/tools/data/public-tools.json |
| Notes | apps/web/notes/data/public-notes.json |

## GitHub Pages

scripts/build-public.mjsがdist/を毎回再生成し、apps/web/だけをコピーします。

- apps/admin/はコピーしない
- Backup JSONを配置しない
- シンボリックリンクを許可しない
- GitHub Actionsがdist/をPagesへデプロイする

## Design Policy

- ES Modules
- 責務分離
- 既存構造を維持する最小修正
- user-controlled textにinnerHTMLを使わない
- URLはhttp/httpsだけを外部リンクとして扱う
- PublicにAdmin情報を出さない
- モバイル対応
- Light / Dark両テーマ対応

## Validation

~~~bash
npm run check
npm run build:public
git diff --check
~~~

公開前はPC幅、390px、360pxで横スクロールがないこと、主要検索・お気に入り・共有URL・テーマ切り替えを確認します。
