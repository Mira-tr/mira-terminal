# MIRA Terminal

MIRAの制作活動をまとめる統合プラットフォームです。

TRPGシナリオ管理を中心に、今後はゲーム制作、便利ツール、制作メモなどを統合していく予定です。

---

## Modules

現在想定しているモジュールは以下です。

- TRPG
- Game
- Tools
- Notes

---

## Current Status

現在開発中：

- TRPG Scenario Admin
- TRPG Scenario Public Library

---

## TRPG Module

TRPGモジュールでは、所持・おすすめシナリオを管理し、Public画面で検索できるようにします。

### Admin

Admin画面では、TRPGシナリオの登録・編集・整理を行います。

主な機能：

- シナリオ登録
- 作者管理
- タグ管理
- 状態管理
- 検索・絞り込み
- バックアップ
- Public Export
- 公開品質警告

Admin画面：

```txt
apps/admin/trpg/
```

---

### Public

Public画面では、公開状態のシナリオだけを検索・閲覧できます。

主な機能：

- キーワード検索
- システム絞り込み
- 人数絞り込み
- 時間絞り込み
- 年齢区分絞り込み
- タグAND検索
- 並び替え
- もっと見る
- お気に入り
- 詳細モーダル

Public画面：

```txt
apps/web/trpg/
```

---

## Local Development

ローカル確認には `dotnet-serve` を使用します。

起動：

```bash
dotnet serve -p 8000
```

Admin画面：

```txt
http://localhost:8000/apps/admin/trpg/
```

Public画面：

```txt
http://localhost:8000/apps/web/trpg/
```

---

## Data Flow

TRPG Public画面は、Admin画面のlocalStorageを直接参照しません。

基本的な流れ：

```txt
Adminでシナリオ登録
↓
状態を「公開」にする
↓
Public Export
↓
public-scenarios.json にリネーム
↓
apps/web/trpg/data/public-scenarios.json に配置
↓
Public画面で確認
```

詳しい手順：

- [TRPG Publicデータ更新手順](./docs/public-data-update.md)

---

## Public Data Policy

著作権リスクを避けるため、Public画面では外部作品の画像・動画埋め込みは扱いません。

扱うもの：

- 自分で入力した概要
- 自分で入力した注意事項
- 自分で付けたタグ
- 配布ページへの外部リンク

扱わないもの：

- BOOTH等の商品説明文の丸コピー
- トレーラー画像
- YouTube埋め込み
- 管理用メモ

---

## Directory Overview

```txt
apps/
├ admin/
│  ├ trpg/
│  └ js/
├ web/
│  └ trpg/
shared/
docs/
```

---

## Commit Examples

Publicデータ更新：

```bash
git commit -m "chore(web-trpg): update public scenario data"
```

Admin機能追加：

```bash
git commit -m "feat(admin-trpg): add ..."
```

Public機能追加：

```bash
git commit -m "feat(web-trpg): add ..."
```

ドキュメント更新：

```bash
git commit -m "docs(trpg): update ..."
```