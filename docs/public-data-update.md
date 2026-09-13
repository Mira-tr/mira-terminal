# Publicデータ更新手順

RELMUA AdminからPublic Webへ安全に反映するための運用手順です。

## 基本方針

- `apps/admin/` は編集・管理領域、`apps/web/` は公開領域です。
- AdminのCMS-backed recordを編集の正本とし、PublicはPublic-safe Snapshotだけを読みます。
- PublicページはCMSやAdminのlocalStorageを直接参照しません。
- `memo` / `status` / `createdAt` / `updatedAt` などの管理項目をPublicへ出しません。
- 外部URLは `http:` / `https:` だけを許可します。
- Backupは復旧専用です。Publicデータとして配置しません。
- GitHub Pagesの公開正本はrepository上のPublic JSONと静的ファイルです。

## 通常の公開フロー

通常はAdmin内で次の順番で操作します。

1. Adminで編集する
2. 保存する。保存時点では本番Webは変わりません
3. `System → Publish` を開く
4. 公開前チェックを確認する
5. Adminから公開を実行する
6. Public-safe Snapshot PackageがSupabase publication queueへ登録される
7. GitHub Actionsのpublication workerがpackageを取得する
8. `scripts/apply-public-package.mjs` が許可済みPublic JSONだけをrepositoryへ適用する
9. `npm run check` とPublic buildを通す
10. GitHub Pagesへdeployする
11. publication resultがAdminから確認できる状態になる

ブラウザのAdminはGitHub tokenを保持しません。GitHubへの書き込みとPages deployは、認証済みpublication queueとGitHub OIDCを介したworkerだけが行います。

自動公開が利用できない場合だけ、Publish画面のRecovery用Public Snapshot Packageを使います。手動適用はrepository rootで次を実行します。

```text
node scripts/apply-public-package.mjs "<downloaded-package.json>"
```

その後 `npm run check`、差分確認、commit / push、Pages成功確認まで行います。

## AdminとWebの対応

Public ↔ Editor registryで、公開ページと編集画面を1対1で結びます。

- RELMUA Home → Home Admin → `public-home.json`
- RELMUA About → Brand & System Settings → `public-brand.json`
- RELMUA Contact → Brand & System Settings → `public-brand.json`
- RELMUA共有Navigation → Brand & System Settings → `public-brand.json`
- Projects → Game / Projects Admin → `public-games.json`
- Tools → Tools Admin → `public-tools.json`
- Notes → Notes Admin → `public-notes.json`
- Creators → Creators Admin → `public-creators.json`
- 千景 Profile → Creator CMS → `public-profile.json`
- 千景 TRPG Scenario → TRPG Admin → `public-scenarios.json`
- 千景 House Rules → TRPG Rules Admin → `house-rules.json`

RELMUA本体とCreator領域は別scopeです。千景は `Creators → 千景` のCreator領域であり、RELMUA Brandそのものではありません。

## Brand Site Public Snapshot

About / Contact / 共有Navigationは `brand-site` CMS recordを正本とします。Adminの `System → Settings` に編集UIがあり、保存後の公開時に `apps/web/data/public-brand.json` を生成します。

Web側は静的HTMLをSEO・障害時のfallbackとして残し、通常表示では `public-brand.json` を読み、`data-brand-field` で明示された本文だけを安全なDOM APIで置き換えます。NavigationのURLはPublic surface contract側で固定し、Adminから変更できるのは表示ラベルだけです。

Public runtimeは `innerHTML` を使わず、`textContent` / `createTextNode` / `replaceChildren` を使います。タイトル内の改行もDOM nodeとして生成します。

## Public Snapshot Package

packageの `schemaVersion` は `1`、`module` は `public-snapshot-package` です。現在のpackageには次の9ファイルを含みます。

| target | 出力ファイル | repository配置先 |
|---|---|---|
| home | public-home.json | apps/web/data/public-home.json |
| brand-site | public-brand.json | apps/web/data/public-brand.json |
| projects | public-games.json | apps/web/game/data/public-games.json |
| tools | public-tools.json | apps/web/tools/data/public-tools.json |
| notes | public-notes.json | apps/web/notes/data/public-notes.json |
| creators | public-creators.json | apps/web/data/public-creators.json |
| profile | public-profile.json | apps/web/data/public-profile.json |
| trpg-scenarios | public-scenarios.json | apps/web/data/creators/chikage/trpg/public-scenarios.json |
| house-rules | house-rules.json | apps/web/data/creators/chikage/trpg/house-rules.json |

`apply-public-package.mjs` はこのallowlist以外の書き込みを拒否します。target、filename、destinationの改ざん、Admin専用field、http/https以外の外部URL、repository外へのpathは拒否されます。

## Home Public Export

`public-home.json` はHomeのsection表示設定だけを持ちます。Project、Tool、Note、Creator、TRPG Scenario recordそのものを複製しません。

Homeの表示対象は各Public JSONのIDを参照し、各recordの正本を重複させません。

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
- 千景はCreator `creator-chikage` として扱う

## Backup / Restore

Backupは管理データの保存・復元専用です。Brand Siteも他のCMS-backed targetと同様にBackup対象へ含めます。

- 日付付きファイル名を維持する
- `apps/web/` や公開packageへBackupそのものを混ぜない
- Import前にpreviewする
- Import適用時はCMSを先に更新し、その後compatibility cacheを揃える
- Restore失敗時は取得済みcanonical stateへrollbackする

## GitHub Pages

mainへの通常pushでは既存Pages workflowが `npm run check`、Public build、artifact upload、deployを行います。Adminからの自動公開ではpublication workerが同じ安全性チェックを通してからPagesへdeployします。

## トラブルシューティング

### Adminで保存したのに本番が変わらない

保存はCMS正本の更新です。`System → Publish` から公開し、publication / Pages workflowが成功するまで確認してください。

### About / Contact / Navigationだけ変わらない

`public-brand.json` が最新packageに含まれているか確認し、Web側で `brandContent.js` が読み込まれているか確認してください。JSON取得失敗時は静的HTML fallbackが表示されます。

### 公開パッケージを適用できない

- packageのschemaVersion / moduleを確認する
- target / filename / destinationを手で変更していないか確認する
- Public payloadにAdmin専用項目が入っていないか確認する
- URLがhttp/httpsか確認する

### JSONを置いても反映されない

- 固定ファイル名と配置先を確認する
- `node scripts/build-public.mjs` を再実行する
- ブラウザを再読み込みする
- GitHub ActionsのPages実行結果を確認する

## 関連文書

- [v1.0運用メモ](./v1.0-release.md)
- [TRPG Public JSON Schema](./public-schema.md)
