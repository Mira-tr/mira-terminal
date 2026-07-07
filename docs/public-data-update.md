# TRPG Publicデータ更新手順

MIRA Terminal の TRPG Public画面で使用する公開データを更新する手順です。

Public画面は、Admin画面のlocalStorageを直接参照しません。  
Admin画面から公開用JSONを出力し、Public側の所定位置へ配置する必要があります。

---

## 目的

Adminで管理しているTRPGシナリオのうち、状態が「公開」のものだけをPublic画面に反映します。

Public側に出力される情報は、公開しても問題ない項目だけです。

出力される主な項目：

- タイトル
- 読み仮名
- 作者
- システム
- 人数
- 時間
- ロスト率
- 年齢区分
- 形式
- シリーズ
- 短い概要
- 注意事項
- タグ
- 配布ページURL

出力されない項目：

- 管理用メモ
- 状態
- 作成日時
- 更新日時

---

## 更新手順

### 1. Admin画面を開く

ローカルサーバーを起動します。

```bash
dotnet serve -p 8000
```

Admin画面を開きます。

```txt
http://localhost:8000/apps/admin/trpg/
```

---

### 2. 公開状態を確認する

Admin一覧で、Publicに出したいシナリオの状態を「公開」にします。

公開前に確認する項目：

- URLが入力されている
- タグが設定されている
- 短い概要が入力されている
- 公開警告が出ていない

公開警告が出ている場合は、先に編集して修正します。

---

### 3. Public Exportを実行する

Admin画面の `Public Export` から、次のボタンを押します。

```txt
公開データ出力
```

出力されるファイル名の例：

```txt
mira-terminal-trpg-public-scenarios-20260707.json
```

---

### 4. 出力JSONを確認する

出力されたJSONを開き、次を確認します。

```json
"exportType": "public-scenarios"
```

```json
"exportVersion": "1.1.0"
```

```json
"publicScenarios": 4
```

`warnings` がある場合は内容を確認します。

`missing-summary` などが出ている場合、Public画面自体は動きますが、詳細表示の情報が不足します。

---

### 5. ファイル名を変更する

出力されたJSONを次の名前に変更します。

```txt
public-scenarios.json
```

---

### 6. Public側のdataフォルダへ配置する

次の場所へ配置します。

```txt
apps/web/trpg/data/public-scenarios.json
```

既存のファイルがある場合は上書きします。

---

### 7. Public画面を確認する

Public画面を開きます。

```txt
http://localhost:8000/apps/web/trpg/
```

確認する項目：

- 一覧が表示される
- 検索できる
- タグ絞り込みできる
- 並び替えできる
- お気に入りが動く
- 詳細モーダルが開く
- 概要が表示される
- 注意事項が表示される
- 配布ページリンクが動く

---

## 動作確認チェックリスト

更新後、最低限これを確認します。

```txt
□ Public画面が白画面になっていない
□ 検索結果の件数が想定通り
□ 公開したシナリオだけ表示されている
□ 非公開・未整理のシナリオが表示されていない
□ 詳細モーダルが開く
□ summary / notes が表示される
□ お気に入り機能が壊れていない
□ 配布ページURLが開ける
```

---

## commit手順

Publicデータを更新したら、変更を確認します。

```bash
git status
```

追加・変更されたPublic JSONをステージします。

```bash
git add apps/web/trpg/data/public-scenarios.json
```

commitします。

```bash
git commit -m "chore(web-trpg): update public scenario data"
```

---

## よくあるミス

### ファイル名が違う

NG：

```txt
mira-terminal-trpg-public-scenarios-20260707.json
```

OK：

```txt
public-scenarios.json
```

Public画面は次のファイル名を読み込みます。

```txt
apps/web/trpg/data/public-scenarios.json
```

---

### 配置場所が違う

NG：

```txt
apps/admin/trpg/data/public-scenarios.json
```

OK：

```txt
apps/web/trpg/data/public-scenarios.json
```

Admin側ではなく、Public側のdataフォルダに置きます。

---

### Exportしただけで反映したと思う

AdminでPublic Exportしただけでは、Public画面には反映されません。

必ず次の作業が必要です。

```txt
Export
↓
リネーム
↓
apps/web/trpg/data/ に配置
↓
Public画面で確認
↓
commit
```

---

### 古いJSONを見ている

ブラウザキャッシュやローカルサーバーの状態で、古いデータを見ている可能性があります。

対処：

- ページを再読み込みする
- DevToolsを開いて再読み込みする
- `public-scenarios.json` の中身を直接確認する
- ローカルサーバーを再起動する

---

## やってはいけないこと

### 管理用メモをPublicに出さない

`memo` は管理用です。  
Public Exportに含めてはいけません。

---

### BOOTH等の商品説明文を丸コピーしない

`summary` は自分の言葉で短く書きます。  
配布ページの説明文をそのまま転載しないでください。

---

### 画像やYouTubeをPublicデータに入れない

著作権リスクを避けるため、Public画面では画像・動画埋め込みを扱いません。

使うのは配布ページへの外部リンクだけです。

---

## commitメッセージ例

Publicデータ更新：

```bash
git commit -m "chore(web-trpg): update public scenario data"
```

手順書更新：

```bash
git commit -m "docs(trpg): update public data workflow"
```

初回作成：

```bash
git commit -m "docs(trpg): add public data update workflow"
```