# TRPG Public JSON Schema

MIRA Terminal TRPG Public画面で使用する公開データのJSONスキーマ定義です。

---

## 概要

Admin画面から出力されるPublic用JSONは、公開状態のシナリオデータのみを含みます。
管理用情報は除外され、Public画面で安全に使用できる項目だけが含まれます。

---

## ファイル配置

```txt
apps/web/trpg/data/public-scenarios.json
```

---

## JSON構造

### ルートオブジェクト

```json
{
  "app": "MIRA Terminal",
  "module": "trpg",
  "exportType": "public-scenarios",
  "exportVersion": "1.1.0",
  "schemaVersion": 1,
  "exportedAt": "ISO8601形式",
  "counts": { ... },
  "warnings": [ ... ],
  "scenarios": [ ... ]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| app | string | ✓ | アプリケーション名 |
| module | string | ✓ | モジュール名 |
| exportType | string | ✓ | エクスポート種別（固定値: "public-scenarios"） |
| exportVersion | string | ✓ | エクスポートフォーマットバージョン |
| schemaVersion | number | ✓ | スキーマバージョン |
| exportedAt | string | ✓ | エクスポート日時（ISO8601） |
| counts | object | ✓ | 統計情報 |
| warnings | array | ✓ | 公開警告リスト |
| scenarios | array | ✓ | シナリオデータ配列 |

---

### countsオブジェクト

```json
{
  "sourceScenarios": 4,
  "publicScenarios": 4,
  "warnings": 1
}
```

| フィールド | 型 | 説明 |
|-----------|------|------|
| sourceScenarios | number | Admin側の全シナリオ数 |
| publicScenarios | number | 公開状態のシナリオ数 |
| warnings | number | 公開警告の数 |

---

### warnings配列

```json
[
  {
    "id": "UUID",
    "title": "シナリオタイトル",
    "type": "警告タイプ",
    "message": "警告メッセージ"
  }
]
```

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | string | シナリオID |
| title | string | シナリオタイトル |
| type | string | 警告タイプ（missing-summary, invalid-urlなど） |
| message | string | 警告メッセージ |

---

### scenarios配列

各シナリオオブジェクトは以下のフィールドを含みます。

```json
{
  "id": "UUID",
  "title": "タイトル",
  "kana": "読み仮名",
  "author": "作者",
  "system": "システム",
  "playersRaw": "人数表記",
  "playersMin": 最小人数,
  "playersMax": 最大人数,
  "timeRaw": "時間表記",
  "timeMin": 最短時間,
  "timeMax": 最長時間,
  "loss": "ロスト率",
  "rating": "年齢区分",
  "scenarioType": "形式",
  "series": "シリーズ",
  "summary": "短い概要",
  "notes": "注意事項",
  "tags": [ "タグ1", "タグ2" ],
  "url": "配布ページURL"
}
```

#### 公開用フィールド詳細

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| id | string | ✓ | シナリオID（UUID） |
| title | string | ✓ | シナリオタイトル |
| kana | string | - | 読み仮名 |
| author | string | - | 作者名 |
| system | string | - | システム（CoC6, CoC7, エモクロア, その他） |
| playersRaw | string | - | 人数表記（例：2〜4PL） |
| playersMin | number \| null | - | 最小人数 |
| playersMax | number \| null | - | 最大人数 |
| timeRaw | string | - | 時間表記（例：6〜8h） |
| timeMin | number \| null | - | 最短時間（時間） |
| timeMax | number \| null | - | 最長時間（時間） |
| loss | string | - | ロスト率（不明, なし, 低, 中, 高, 特殊） |
| rating | string | - | 年齢区分（all, r18, r18g） |
| scenarioType | string | - | 形式（例：シティ, クローズド, 半テキ） |
| series | string | - | シリーズ名 |
| summary | string | - | 短い概要（MIRAが自分の言葉で書く紹介文） |
| notes | string | - | 注意事項（参加判断に必要な情報） |
| tags | array | - | タグ配列（文字列） |
| url | string | - | 配布ページURL（http:// または https://） |

---

## 除外される管理用フィールド

以下のフィールドはAdmin専用情報として、Public Exportから除外されます。

- **status**: 状態（draft, ready, public, private）
- **memo**: 管理用メモ
- **storageLocations**: 保存場所
- **storageNote**: 保存場所メモ
- **createdAt**: 作成日時
- **updatedAt**: 更新日時

これらのフィールドはPublic JSONには含まれません。

---

## バージョン管理

### exportVersion

エクスポートフォーマットの構造変更時に更新します。

- **1.0.0**: 初期版
- **1.1.0**: 現行版

### schemaVersion

スキーマ定義のバージョンです。

- **1**: 現行版

---

## データ制約

### URL

- `http://` または `https://` で始まる正しいURLのみ許可
- それ以外の形式は無効として扱われる

### タグ

- 空配列の場合は「タグなし」として扱われる
- 重複タグは正規化されて除外される

### 数値フィールド

- `playersMin`, `playersMax`, `timeMin`, `timeMax` は数値または `null`
- `null` は「不明」または「未設定」を意味する

---

## 公開品質警告

以下の条件で警告が発生します。

| タイプ | 条件 | 影響 |
|--------|------|------|
| missing-summary | summaryが空文字 | 詳細表示の情報が不足 |
| invalid-url | URLが不正形式 | 配布ページリンクが無効 |

警告が出てもPublic画面は動作しますが、ユーザー体験が低下する可能性があります。

---

## 互換性

Public画面は現在のschemaVersion 1に対応しています。

schemaVersionが変更される場合：
- 旧バージョンのJSONは読み込み時に変換処理が必要
- またはPublic画面の更新が必要

---

## 関連ドキュメント

- [TRPG Publicデータ更新手順](./public-data-update.md)
