# TRPG Public JSON Schema

MIRA Terminal v0.9 PreviewのTRPG Scenario / House Rules Public Export仕様です。

## 配置先

~~~text
apps/web/trpg/data/public-scenarios.json
~~~

## ルート構造

~~~json
{
  "app": "MIRA Terminal",
  "module": "trpg",
  "exportType": "public-scenarios",
  "exportVersion": "1.2.0",
  "schemaVersion": 1,
  "exportedAt": "ISO8601形式",
  "counts": {
    "sourceScenarios": 0,
    "publicScenarios": 0,
    "warnings": 0
  },
  "warnings": [],
  "scenarios": []
}
~~~

| フィールド | 型 | 説明 |
|---|---|---|
| app | string | アプリケーション名 |
| module | string | trpg |
| exportType | string | public-scenarios |
| exportVersion | string | 現行は1.2.0 |
| schemaVersion | number | 現行は1 |
| exportedAt | string | 出力日時 |
| counts | object | 元データ数・公開数・警告数 |
| warnings | array | 公開品質警告 |
| scenarios | array | 公開シナリオ |

## Scenarioフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | シナリオID |
| title | string | タイトル |
| kana | string | 読み仮名 |
| author | string | 作者 |
| system | string | システム |
| playersRaw | string | 人数表示 |
| playersMin / playersMax | numberまたはnull | 人数範囲 |
| timeRaw | string | 時間表示 |
| timeMin / timeMax | numberまたはnull | 時間範囲 |
| loss | string | ロスト率 |
| rating | string | allまたはr18 |
| scenarioType | string | 形式 |
| series | string | シリーズ |
| summary | string | 短い概要 |
| notes | string | 注意事項 |
| tags | string[] | タグ |
| url | string | http/httpsの配布ページURL |

## rating

| 値 | Public表示 |
|---|---|
| all | 全年齢 |
| r18 | R18 |

Public ExportとPublic読込時に正規化します。

- R18G、R-18G、r18g、adult、hard、mature、18禁などはr18
- 空欄・未設定・不正値はall

細かな注意要素はratingを増やさず、グロ注意・暴力描写・欠損・倫理観・性的描写・人を選ぶ等のタグで扱います。

## Public Exportに含めない管理項目

- status
- memo
- storageLocations
- storageNote
- createdAt
- updatedAt

## 公開品質警告

| 種別 | 条件 |
|---|---|
| missing-title | タイトルなし |
| missing-url | URLなし |
| invalid-url | http/https以外 |
| missing-tags | タグなし |
| missing-summary | 短い概要なし |

## 互換性

Public側はschemaVersion 1を読み込みます。旧ratingは読込時にall / r18へ変換するため、旧JSONでもページ表示を継続できます。

---

# TRPG House Rules Public JSON Schema

## 配置先

~~~text
apps/web/trpg/rules/data/house-rules.json
~~~

## ルート構造

~~~json
{
  "app": "MIRA Terminal",
  "module": "trpg",
  "exportType": "house-rules",
  "exportVersion": "1.0.0",
  "schemaVersion": 1,
  "exportedAt": "ISO8601形式",
  "systems": []
}
~~~

## Systemフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | システムID |
| label | string | 短い表示名 |
| title | string | Publicページ上の文書タイトル |
| version | string | ルール文書バージョン |
| description | string | 概要 |
| sections | array | 公開セクション |

## Sectionフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | セクションID |
| order | number | 表示順 |
| category | string | カテゴリ |
| title | string | セクションタイトル |
| body | string | 本文 |

## Public Exportに含めない管理項目

- system.status
- section.status
- createdAt
- updatedAt
- private memo
- draft / private section
- 管理専用情報

## 互換性

Public側は旧house-rules.jsonも読み込みます。

- system.titleがない場合はlabelを表示
- system.versionがない場合は非表示
- section.categoryがない場合は未分類
- section.orderがない場合は配列順
- section.titleが空でも表示は継続
