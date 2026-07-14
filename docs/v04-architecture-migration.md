# RELMUA v0.4 Architecture Migration

この文書は、`v0.3.0-relmua-public` から v0.4 へ進むための監査・移行チェックリストです。

Phase A では現状依存と将来契約を固定しました。Phase B ではAdmin / Terminalの責務分離を行い、Phase C では千景TRPGのPublic source、URL、navigation、assetsをCreator配下へ移します。Phase D ではPublic JSON正本、Export destination、Build allowlist、Public DATA_URLをCreator配下へ移し、旧JSON配置を正本から外します。

## 目的

v0.4 では、RELMUA Brand、Creator、Personal Module、System の責務を分離します。特に TRPG は RELMUA 共通Moduleではなく、千景サイトの内部機能として扱います。

```text
RELMUA
├── Brand
├── Creators
│   └── 千景
│       └── TRPG
│           ├── Scenario Library
│           └── House Rules
└── System
```

## 責務

| 領域 | 責務 |
|---|---|
| Brand | RELMUA全体のHome、Projects、Tools、Notes、Creators、About、Contact、公開構成 |
| Creator | 活動者ごとのHome、Profile、Works、Contact、個人サイト構成 |
| Personal Module | Creatorに属する機能群。千景TRPG、将来の朝霧TRPGなど |
| System | Backup、Import、Export、Publish、Settings、Logs、Terminal基盤 |

## 千景TRPGの所有関係

- owner Creator: `creator-chikage`
- 現在のModule ID: `module-trpg`
- v0.4推奨Module ID: `module-creator-chikage-trpg`
- TRPGは千景のPersonal Moduleであり、朝霧がTRPGを持つ場合は別Moduleとして追加します。
- Chikage TRPGを `ownerCreatorId` だけで切り替えて他Creatorと共有しません。

## 正規URL

| 種別 | v0.4正規URL |
|---|---|
| Scenario Library | `/creators/chikage/trpg/` |
| House Rules | `/creators/chikage/trpg/rules/` |

## 旧URL廃止方針

旧URLは永久互換にしません。移行期間の転送候補として扱い、canonical、sitemap、internal link、Registry、Build正本からは外します。

| 旧URL | 現在の用途 | 新しい正規URL | redirect | redirect期間 | canonical | internal link | sitemap | 最終削除条件 |
|---|---|---|---|---|---|---|---|---|
| `/trpg/` | 現在のScenario Library正規URL | `/creators/chikage/trpg/` | 必要 | v0.4公開後の短期移行期間 | 新URL | 全削除 | 新URLのみ掲載 | 検索・内部リンク・OGP・docsが新URLへ移行済み |
| `/trpg/rules/` | 現在のHouse Rules正規URL | `/creators/chikage/trpg/rules/` | 必要 | v0.4公開後の短期移行期間 | 新URL | 全削除 | 新URLのみ掲載 | 検索・内部リンク・OGP・docsが新URLへ移行済み |
| `/creator/` | 千景Creator互換入口 | `/creators/chikage/` | 必要なら短期 | v0.4後に廃止時期を明記 | `/creators/chikage/` | 全削除 | 掲載しない | 外部導線更新後 |
| `/game/` | Projects互換入口 | `/projects/` | 必要なら短期 | v0.4後に廃止時期を明記 | `/projects/` | 全削除 | 掲載しない | Public/Admin/docsがProjects表記へ統一済み |

## JSON正本方針

v0.4移行後は新しいCreator配下JSONを唯一の正本にします。

| データ | 現在 | v0.4正本 |
|---|---|---|
| Scenario Library | `apps/web/trpg/data/public-scenarios.json` | `apps/web/data/creators/chikage/trpg/public-scenarios.json` |
| House Rules | `apps/web/trpg/rules/data/house-rules.json` | `apps/web/data/creators/chikage/trpg/house-rules.json` |

許可するもの:

- 移行時の一度限りのデータコピー
- 移行検証
- rollback用のGit履歴
- 短期間の旧URL redirect

許可しないもの:

- 新旧JSONの二重正本
- 旧JSONの恒久fallback読み込み
- 新旧両方へのExport
- Registryから旧配置を参照
- Buildで旧配置を正規Public JSONとして出力

Backup / Import形式、localStorageキー、JSON内容構造は維持します。

## 詳細移動表

| 責務 | 現在パス | 移動先 | 参照元 | 修正対象 | 移行Phase | rollback | 完了条件 |
|---|---|---|---|---|---|---|---|
| Public HTML | `apps/web/trpg/index.html` | `apps/web/creators/chikage/trpg/index.html` | 千景Creator導線、旧URL、tests | HTMLリンク、OGP、canonical、script/css相対パス | C | 旧HTMLを復元 | 新URLでScenario Libraryが動作 |
| Rules HTML | `apps/web/trpg/rules/index.html` | `apps/web/creators/chikage/trpg/rules/index.html` | TRPG sub nav、tests | HTMLリンク、OGP、canonical、script/css相対パス | C | 旧HTMLを復元 | 新URLでHouse Rulesが動作 |
| Public JS | `apps/web/trpg/js/` | `apps/web/creators/chikage/trpg/js/` | TRPG HTML、tests | import、DATA_URL、URL復元、copy URL | C | 旧JSを復元 | 検索/filter/tag/favorite/detailが新URLで動作 |
| Public CSS | `apps/web/trpg/css/` | `apps/web/creators/chikage/trpg/css/` と shared分離 | Brand/Creator/TRPG各HTML | Brand依存CSS分離、相対画像URL | B-C | CSS参照を旧へ戻す | BrandがTRPG CSSへ依存しない |
| Public JSON | `apps/web/trpg/data/public-scenarios.json` | `apps/web/data/creators/chikage/trpg/public-scenarios.json` | TRPG JS、Build、docs、tests | DATA_URL、Build allowlist、Export destination | D | Git履歴から旧配置復元 | 新配置のみBuild正本 |
| Rules JSON | `apps/web/trpg/rules/data/house-rules.json` | `apps/web/data/creators/chikage/trpg/house-rules.json` | Rules JS、Build、docs、tests | DATA_URL、Build allowlist、Export destination | D | Git履歴から旧配置復元 | 新配置のみBuild正本 |
| TRPG assets | `apps/web/assets/editorial/trpg-library.png` | `apps/web/assets/creators/chikage/trpg/` | TRPG CSS、Rules CSS | background URL、OGP候補 | C | URLを旧assetへ戻す | TRPG画像が千景配下へ分離 |
| Admin HTML | `apps/admin/trpg/`, `apps/admin/trpg/rules/` | `apps/admin/creators/chikage/trpg/scenarios/`, `apps/admin/creators/chikage/trpg/rules/` | Admin nav、Terminal | nav、script path、Export表示 | B-C | 旧Admin HTMLを復元 | Terminalから千景TRPGへ到達 |
| Admin features | `apps/admin/js/features/trpg/` | `apps/admin/js/features/creators/chikage/trpg/` または creator module root | Admin pages、tests | imports、shared utility抽出 | C | importを旧へ戻す | Store/Backup/Import/Export互換維持 |
| Registry | `moduleRegistry.js`, `workspaceRegistry.js` | Creator所有Module定義へ更新 | Terminal shell、tests | `moduleId`, `adminPath`, `publicPath`, owner | B | Registryを旧定義へ戻す | `/trpg/`を正規URLとして持たない |
| Build allowlist | `scripts/build-public.mjs` | 新Creator配下JSONのみ許可 | build、tests | PUBLIC_JSON_PATHS | D | allowlist旧値へ戻す | 旧TRPG JSONが正規Public JSONでない |
| Export destination | `scenarioPublicExport.js`, `rulesPublicExport.js` | 新Creator配下JSON | Admin Export UI、docs、tests | destination表示、download手順 | D | destination旧値へ戻す | Export先が新配置のみ |
| Navigation | Brand/Creator/TRPG各HTML | 千景Creator nav中心 | HTML、creators.js、Terminal | internal link置換 | C-E | linkを旧へ戻す | 内部リンクに旧TRPG URLがない |
| canonical | 現状ほぼ未設定 | 新URL canonical | HTML head、tests | canonical追加/更新 | E | canonicalを削除/旧へ戻す | canonicalが新URLのみ |
| OGP | `og:url`がトップURLのTRPGページあり | 新URL | HTML head、OGP tests | og:url, image, description | E | OGP旧値へ戻す | OGPが新URLを指す |
| tests | `apps/web/trpg/...`, `/trpg/` | 新URL/新パスを正規化 | 全テスト | path、URL、redirect契約 | A-E | テストだけ戻す | 旧URLはredirect検証のみ |
| docs | public schema/update/spec/release | v0.4構造へ更新 | docs | JSON配置、URL、運用手順 | A-E | docs旧版へ戻す | docsが二重正本を示さない |

## CSS依存監査

Phase A時点で、BrandページやCreatorページが `trpg/css/style.css` を土台として読み込んでいました。Phase CではBrand / CreatorページからTRPG CSS依存を外し、TRPG CSSは千景TRPG配下の本体ページだけが読み込む状態へ移行します。

### Brand sharedへ移すべきもの

対象ページ:

- `apps/web/index.html`
- `apps/web/about/index.html`
- `apps/web/contact/index.html`
- `apps/web/creators/index.html`
- `apps/web/projects/index.html`
- `apps/web/tools/index.html`
- `apps/web/notes/index.html`
- `apps/web/404.html`
- `apps/web/game/index.html`
- `apps/web/creator/index.html`

これらはBrandページまたは互換入口であり、TRPG CSSではなく `apps/web/css/brand/` とページ専用CSSで成立させます。

### Creator sharedへ移すべきもの

対象ページ:

- `apps/web/creators/chikage/`
- `apps/web/creators/chikage/profile/`
- `apps/web/creators/chikage/works/`
- `apps/web/creators/chikage/contact/`
- `apps/web/creators/asagiri/`
- `apps/web/creators/asagiri/profile/`
- `apps/web/creators/asagiri/works/`
- `apps/web/creators/asagiri/contact/`

これらは `apps/web/creators/css/creator-site.css` を中心にし、TRPG CSS依存を外します。

### 千景TRPG専用

対象:

- `apps/web/trpg/css/`
- `apps/web/trpg/rules/css/`

移行後は `apps/web/creators/chikage/trpg/css/` と `rules/css/` へ移し、Scenario Library / House Rules 専用にします。

### 削除候補

- Brand/Creatorページを成立させるためだけに `trpg/css/style.css` から借りている汎用reset/layout/component
- 旧URL互換ページ専用の重複スタイル
- 移行後に参照されない `apps/web/trpg/css/` 配下の旧ファイル

削除はPhase C以降、参照ゼロをテストで確認してから行います。Phase Cでは旧URLページをredirect shellとして残すため、本体CSS/JSは旧URL配下へ戻しません。

## Brand Tools責務監査

現状の `apps/web/tools/data/public-tools.json` には、TRPG検索とHouse RulesがToolとして含まれています。

v0.4方針:

- 千景TRPG内部FeatureはBrand Toolsへ出しません。
- Brand ToolsはRELMUAが提供する共通実用ツールのみを扱います。
- Scenario Library / House Rulesは千景サイト配下のTRPG Featureとして表示します。

移行案:

| 現Tool | 現在URL | v0.4扱い |
|---|---|---|
| TRPG Scenario検索ツール | `/trpg/` | Brand Toolsから除外。千景TRPG内Featureへ |
| House Rules閲覧ページ | `/trpg/rules/` | Brand Toolsから除外。千景TRPG内Featureへ |

Phase Dでは既存Public Tools JSONから千景TRPG内部Featureを除外し、Brand ToolsはRELMUA共通の実用ツールだけを扱います。現時点で公開できる共通Toolがないため、`tools` は空配列とし、Public側はEmpty Stateで成立させます。

## canonical / OGP移行

- TRPGページの `og:url` は新URLへ更新します。
- 新TRPGページには canonical を追加します。
- 旧URL redirectページには canonical として新URLを設定します。
- Brand OGP、Creator OGP、TRPG OGPを混在させません。

## internal link置換

置換対象:

- 千景サイト内の `../../trpg/`, `../../../trpg/`
- House Rulesへの `../../trpg/rules/`, `../../../trpg/rules/`
- `creators.js` 内のTRPG導線
- docs/tests内の正規URL表記

置換後:

- `/creators/chikage/trpg/`
- `/creators/chikage/trpg/rules/`

## 完了条件

- TRPG正規URLが `/creators/chikage/trpg/` と `/creators/chikage/trpg/rules/`
- 旧 `/trpg/` と `/trpg/rules/` はredirect候補だけ
- Registry、Build、Export destination が旧配置を正本として参照しない
- Public JSON正本がCreator配下のみ
- 旧TRPG JSON配置が存在せず、Build allowlistにも含まれない
- 新旧JSONの二重正本がない
- BrandページがTRPG CSSへ依存しない
- Brand Toolsに千景TRPG内部Featureが出ない
- localStorageキー、Backup / Import形式、JSON内容構造は維持
- TRPG検索、filter、tag、favorite、detail、URL復元、House Rules本文構造が維持
- distにAdminが含まれない

## rollback

各Phaseは単独で戻せるようにします。

- Phase B: Terminal/Admin navとRegistryだけ戻す
- Phase C: Public/Admin source移動だけ戻す
- Phase D: Build allowlistとExport destinationだけ戻す
- Phase E: canonical/OGP/docs/testsだけ戻す

旧JSONを恒久fallbackとして読む設計にはしないため、rollbackはGit履歴から旧配置を復元する方式にします。
