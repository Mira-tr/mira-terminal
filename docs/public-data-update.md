# Publicデータ更新手順

MIRA Terminal v0.9 Previewで、Adminの管理データをPublicページへ反映する手順です。

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
| Profile / Links | public-profile.json | apps/web/data/public-profile.json |
| TRPG Scenario | public-scenarios.json | apps/web/trpg/data/public-scenarios.json |
| TRPG House Rules | house-rules.json | apps/web/trpg/rules/data/house-rules.json |
| Game | public-games.json | apps/web/game/data/public-games.json |
| Tools | public-tools.json | apps/web/tools/data/public-tools.json |
| Notes | public-notes.json | apps/web/notes/data/public-notes.json |

Public Exportのファイル名は固定です。日付付きのBackupファイルをPublic用へ流用しないでください。

## 更新手順

1. ローカルHTTPサーバーを起動し、Admin Hubを開く
2. 対象データを編集し、公開レコードをpublic状態にする
3. TRPG ScenarioではURL・タグ・短い概要の公開警告を解消する
4. 対象モジュールのPublic Exportを実行する
5. 固定名JSONを上表の配置先へ上書きする
6. npm run checkを実行する
7. npm run build:publicを実行する
8. PublicページをHTTPサーバー経由で確認する
9. Public JSONをcommitしてmainへpushする
10. GitHub ActionsのPagesデプロイ成功を確認する

## TRPG Scenario確認事項

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

## Backup運用

Backup Exportは管理データの保存・復元専用です。

- 日付付きファイル名を維持する
- 定期的に別の安全な場所へ保管する
- Publicデータフォルダへ置かない
- Import前に対象モジュールと内容を確認する
- TRPG ScenarioのratingはImport時にall / r18へ正規化される

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

- [v0.9 Preview運用メモ](./v0.9-preview.md)
- [TRPG Public JSON Schema](./public-schema.md)
