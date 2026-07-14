# Publicデータ更新手順

RELMUA Phase 1で、Adminの管理データをPublicページへ反映する手順です。

## 基本方針

- AdminデータはブラウザのlocalStorageで管理します。
- PublicページはlocalStorageを直接参照しません。
- Public Exportはpublic状態の公開用項目だけを出力します。
- Backup Exportはdraft / private / publicと管理情報を含みます。
- Backup JSONはapps/web/やdist/へ配置しません。
- GitHub Pagesではapps/web/から生成したdist/だけを公開し、Adminは公開しません。

## Public JSON配置先

| モジュール | 出力ファイル名 | 配置先 |
|---|---|---|
| Creators | public-creators.json | apps/web/data/public-creators.json |
| Home | public-home.json | apps/web/data/public-home.json |
| Profile / Links | public-profile.json | apps/web/data/public-profile.json |
| TRPG Scenario | public-scenarios.json | apps/web/data/creators/chikage/trpg/public-scenarios.json |
| TRPG House Rules | house-rules.json | apps/web/data/creators/chikage/trpg/house-rules.json |
| Game | public-games.json | apps/web/game/data/public-games.json |
| Tools | public-tools.json | apps/web/tools/data/public-tools.json |
| Notes | public-notes.json | apps/web/notes/data/public-notes.json |

### Home Public Export

Home Admin exports the saved Home Configuration only.

1. Save Home Configuration in `apps/admin/home/`.
2. Run Public Export.
3. Place the downloaded `public-home.json` at `apps/web/data/public-home.json`.
4. Run `node scripts/build-public.mjs`.

`public-home.json` stores section display settings only. It must not copy Project,
Tool, Note, or Creator records.

Public Exportのファイル名は固定です。日付付きのBackupファイルをPublic用へ流用しないでください。

## 更新手順

1. ローカルHTTPサーバーを起動し、Admin Hubを開く
2. 対象データを編集し、公開レコードをpublic状態にする
3. TRPG ScenarioではURL・タグ・短い概要の公開警告を解消し、Creator配下の正本JSONへExportする
4. 対象モジュールのPublic Exportを実行する
5. 固定名JSONを上表の配置先へ上書きする
6. npm run checkを実行する
7. npm run build:publicを実行する
8. PublicページをHTTPサーバー経由で確認する
9. Public JSONをcommitしてmainへpushする
10. GitHub ActionsのPagesデプロイ成功を確認する

## TRPG Scenario確認事項

TRPG Public JSONの正本は `apps/web/data/creators/chikage/trpg/` 配下です。旧 `apps/web/trpg/.../data/` 配置へはExportしません。


- public状態のシナリオだけが含まれる
- ratingはallまたはr18だけ
- memo、storageLocations、storageNote、status、createdAt、updatedAtが含まれない
- URLはhttpまたはhttps形式
- 概要・注意事項は自分の言葉で記載する
- 細かな注意要素はタグで示す

旧ratingのR18G、R-18G、adult、hardなどはR18へ統合され、空欄・不正値は全年齢になります。

注意タグ例：

- グロ注意
- 暴力描写
- 欠損
- 倫理観
- 性的描写
- 人を選ぶ

## TRPG House Rules確認事項

- public状態のsystemだけが含まれる
- public状態のsectionだけが含まれる
- sectionはorder順に並ぶ
- categoryが未設定の旧データは未分類として扱われる
- title / version / descriptionがPublic文書の冒頭に表示される
- status、createdAt、updatedAt、private memoなどの管理項目が含まれない
- 長文本文はPublic側でカテゴリ別・折りたたみ表示される

## Backup運用

Backup Exportは管理データの保存・復元専用です。

- 日付付きファイル名を維持する
- 定期的に別の安全な場所へ保管する
- Publicデータフォルダへ置かない
- Import前に対象モジュールと内容を確認する
- TRPG ScenarioのratingはImport時にall / r18へ正規化される

## Creators確認事項

- public状態のCreatorが1件以上含まれる
- Primary Creatorが存在し、public状態である
- idとslugが重複していない
- slugは英小文字、数字、ハイフンだけで構成する
- Public JSONのlinksにはstatusを含めない
- Profile / Linksの旧互換データは削除しない

## Creator Ownership確認事項

- Projectsはteam配列でCreatorを参照する
- ProjectsのteamはcreatorId、roleId、primaryだけを含める
- ToolsはmaintainerCreatorIdsでCreatorを参照する
- NotesはauthorCreatorIdでCreatorを参照する
- TRPG ScenarioはownerCreatorIdでCreatorを参照する
- 既存データにCreator参照がない場合はPrimary Creatorとして解決する
- displayName、bio、activities、linksなどのCreatorプロフィール情報を各コンテンツJSONへ複製しない
- 存在しないCreator ID、非public Creator、重複したProject contributorはPublic Exportを停止する

## GitHub Pages

mainへのpush時に次を実行します。

1. npm run check
2. npm run build:public
3. dist/をPages artifactとしてアップロード
4. GitHub Pagesへデプロイ

build:publicはdist/を削除してからapps/web/だけをコピーします。dist/adminは生成されません。

## トラブルシューティング

### JSONを置いても反映されない

- 配置先と固定ファイル名を確認する
- JSONのexportTypeとschemaVersionを確認する
- npm run build:publicを再実行する
- ブラウザを再読み込みする
- GitHub Actionsの実行結果を確認する

### Public ExportとBackupを取り違えた

Public JSONにはexportTypeがあります。Backupには管理用状態や日時が含まれます。AdminからPublic Exportをやり直してください。

### TRPG検索URLが古い

rating=r18g等の旧URLはrating=r18へ正規化されます。不正値は無視され、ページ表示は継続します。

## 関連文書

- [v1.0運用メモ](./v1.0-release.md)
- [TRPG Public JSON Schema](./public-schema.md)
