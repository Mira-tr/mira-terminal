# Publicデータ更新手順

RELMUA AdminからPublicページへ安全に反映するための運用手順です。

## 基本方針

- `apps/admin/` は編集・管理領域、`apps/web/` は公開領域です。
- PublicページはCMSやAdminのlocalStorageを直接参照しません。
- Publicへ出すデータは必ずPublic-safe payloadへ変換します。
- `memo` / `status` / `createdAt` / `updatedAt` などの管理項目をPublicへ出しません。
- 外部URLは `http:` / `https:` だけを許可します。
- Backupは復旧専用です。Publicデータとして配置しません。
- GitHub Pagesの正本はrepository上のPublic JSONと静的ファイルです。

## 推奨フロー

通常の更新は次の順番で行います。

1. Adminで編集する
2. 保存前に「未保存をプレビュー」または「公開ページをプレビュー」で確認する
3. 「このページをチェック」でページ単位の公開条件を確認する
4. 保存する
5. 「公開する」を開く
6. 公開前チェックを通す
7. 「公開パッケージを作る」で1つのPublic Snapshot Packageをダウンロードする
8. repositoryのルートで次を実行する

```text
node scripts/apply-public-package.mjs "<ダウンロードしたpackage.json>"
```

9. スクリプトが許可済みのPublic JSONだけを更新し、`scripts/build-public.mjs` を実行して安全性を確認する
10. `git diff` を確認し、commit / pushする
11. mainへ入った変更のGitHub Pages workflow成功を確認する

ブラウザのAdminはGitHubのtokenを持ちません。Admin画面の「公開する」は、repositoryへ無断で書き込むボタンではなく、Public-safe snapshotを作って既存のGitHub Pages pipelineへ安全に引き渡す入口です。

## Admin内プレビュー

Public ↔ Editor registryで、公開ページと編集画面を1対1で結びます。

- RELMUA本体とCreator領域は別scopeです。
- 千景は `Creators → 千景` のCreator領域です。
- 千景WorkspaceではHome / Works / TRPG / Profile / Contactの文章、Navigation、テーマを保存前にプレビューできます。
- 保存前プレビューもraw Admin recordは渡さず、Creators Public Exportと同じPublic-safe変換を通します。
- preview iframeは同一originの親Adminから届いたmessageだけを受け取ります。

## ページ単位の公開前チェック

Public surface registryは、各ページが依存するPublic Snapshotを持ちます。

例:

- RELMUA Home → `public-home.json`
- Projects → `public-games.json`
- Tools → `public-tools.json`
- Notes → `public-notes.json`
- Creators / 千景 Home / Works / Profile / Contact → `public-creators.json`
- 千景 TRPG → `public-creators.json` + `public-scenarios.json` + `house-rules.json`

Creatorページでは、Creatorの公開状態、表示名、ページ見出しやLeadなども確認します。WorksやContactに公開項目が0件の場合はwarningとして表示します。

## Public Snapshot Package

通常は個別のPublic Exportを1つずつ実行せず、Publish画面から一括packageを作ります。

packageのschemaVersionは`1`、moduleは`public-snapshot-package`です。現在のpackageには次の8ファイルを含みます。

| target | 出力ファイル | repository配置先 |
|---|---|---|
| home | public-home.json | apps/web/data/public-home.json |
| projects | public-games.json | apps/web/game/data/public-games.json |
| tools | public-tools.json | apps/web/tools/data/public-tools.json |
| notes | public-notes.json | apps/web/notes/data/public-notes.json |
| creators | public-creators.json | apps/web/data/public-creators.json |
| profile | public-profile.json | apps/web/data/public-profile.json |
| trpg-scenarios | public-scenarios.json | apps/web/data/creators/chikage/trpg/public-scenarios.json |
| house-rules | house-rules.json | apps/web/data/creators/chikage/trpg/house-rules.json |

`apply-public-package.mjs` はこのallowlist以外の書き込みを拒否します。destinationの改ざん、Admin専用field、http/https以外の外部URL、repository外へのpathは拒否されます。

## 個別Public Export

各管理画面の個別Public Exportは互換・確認用として残します。通常運用は上記の一括packageを推奨します。

個別Exportを使う場合も、ファイル名と配置先は固定です。日付付きのBackupをPublic用へ流用しないでください。

## Home Public Export

`public-home.json` はHomeのsection表示設定だけを持ちます。Project、Tool、Note、Creator、TRPG Scenario recordそのものを複製しません。

`featured-trpg` はscenario ID参照だけを持ち、scenarioの正本は `apps/web/data/creators/chikage/trpg/public-scenarios.json` です。

## TRPG Scenario確認事項

- public状態のシナリオだけを含める
- ratingは `all` または `r18`
- `memo` / `storageLocations` / `storageNote` / `status` / `createdAt` / `updatedAt` を含めない
- URLはhttp/https形式
- 概要・注意事項は自分の言葉で記載する
- 細かな注意要素はタグで示す

旧ratingのR18G、R-18G、adult、hard等はR18へ統合し、空欄・不正値は全年齢として扱います。

## TRPG House Rules確認事項

- public状態のsystemだけを含める
- public状態のsectionだけを含める
- sectionはorder順
- category未設定の旧データは未分類として扱う
- `status` / `createdAt` / `updatedAt` / private memoなどの管理項目を含めない

## Creators確認事項

- public状態のCreatorが1件以上ある
- Primary Creatorが存在しpublic状態である
- idとslugが重複していない
- slugは英小文字・数字・ハイフンだけ
- Public links / worksにstatusを含めない
- 外部URLはhttp/httpsだけ
- Creator Siteのtheme / navigation / page copyは`public-creators.json`の`site`に含める
- 千景はRELMUA brandそのものではなく、Creator `creator-chikage` として扱う

準備中Creatorはnoindexなど既存の公開境界を維持し、公開できる内容と導線が揃った時点で公開します。

## Creator Ownership確認事項

- ProjectsはteamでCreatorを参照する
- ToolsはmaintainerCreatorIdsでCreatorを参照する
- NotesはauthorCreatorIdでCreatorを参照する
- TRPG ScenarioはownerCreatorIdでCreatorを参照する
- displayName / bio / activities / linksを各コンテンツJSONへ重複コピーしない
- 存在しないCreator ID、非public Creator、重複Project contributorはPublic Exportを停止する

## Backup運用

Backupは管理データの保存・復元専用です。

- 日付付きファイル名を維持する
- 安全な場所へ保管する
- `apps/web/` や公開packageへ混ぜない
- Import前に対象と内容を確認する
- Importはpreviewしてから適用する

## GitHub Pages

mainへのpush時に既存workflowが次を実行します。

1. `npm run check`
2. Public buildの検証
3. Pages artifactの作成・upload
4. GitHub Pagesへdeploy

ローカルの`apply-public-package.mjs`も、Public JSON適用後に`node scripts/build-public.mjs`を実行します。これによりpush前にもPublic buildを確認できます。

## トラブルシューティング

### プレビューは変わったのに本番が変わらない

未保存プレビューはAdmin iframe内だけです。保存 → Publish画面でpackage作成 → package適用 → commit / push → Pages成功まで進めてください。

### 公開パッケージを適用できない

- packageのschemaVersion / moduleを確認する
- destinationを手で変更していないか確認する
- Public payloadにAdmin専用項目が入っていないか確認する
- URLがhttp/httpsか確認する

### JSONを置いても反映されない

- 固定ファイル名と配置先を確認する
- `node scripts/build-public.mjs` を再実行する
- ブラウザを再読み込みする
- GitHub ActionsのPages実行結果を確認する

### Public ExportとBackupを取り違えた

Backupには管理状態や日時が含まれます。Public Snapshot Packageまたは対象画面のPublic Exportを作り直してください。

## 関連文書

- [v1.0運用メモ](./v1.0-release.md)
- [TRPG Public JSON Schema](./public-schema.md)
