# RELMUA Studio

RELMUA Studioは、RELMUAを育てるための制作アプリです。

いきなりJSONやフォルダを触る必要はありません。
まずは「何を追加したいか」を選び、Studioの案内に沿って進みます。

## いまStudioでできること

- 今日やることを見る
- Brand / Creators / Systemの作業場所へ移動する
- 千景と朝霧のCreator作業場所へ移動する
- TRPGシナリオを、既存Editorと同じ入力フォームで追加する
- 新しい活動者を、既存Creator管理フォームから追加する
- 公開用データ、バックアップ、公開前確認へ進む

## 新しい活動者を追加する

1. Studioを開く
2. `＋ 新しく追加` を押す
3. `活動者` を選ぶ
4. 内容を確認する
5. `活動者の追加画面を開く` を押す
6. 表示名、slug、プロフィールなどを入力する
7. 保存する

活動者の追加フォームは、既存のCreator管理フォームを使います。
Studio専用の別フォームは作りません。
そのため、将来入力項目が増えても、直す場所は一つです。

## TRPGシナリオを追加する

1. Studioを開く
2. `＋ 新しく追加` を押す
3. `コレクション` を選ぶ
4. `TRPG` を選ぶ
5. 活動者で `千景` を選ぶ
6. `Studioで入力を始める` を押す
7. シナリオの内容を入力する
8. 保存する
9. 表示を確認する

TRPGの入力フォームは、Browser Adminと同じEditor本体を使います。
入力項目、保存、タグ、作者、Exportの仕組みは変えません。

## 朝霧とTRPGについて

朝霧はCreatorとして表示します。
ただし、いまTRPGを持っているのは千景だけです。

そのため、TRPG追加の活動者選択には千景だけが出ます。
朝霧にTRPGを勝手に混ぜません。

## まだStudioで直接編集しないもの

次の操作は、今は既存のBrowser Admin画面を開きます。

- Creatorの詳しい編集
- Brandの各編集
- Backup
- Import
- Export
- Publish

これは機能を減らすためではなく、同じフォームを二重に作らないためです。

## 守ること

Studioは次の互換性を壊しません。

- localStorageキー
- Backup形式
- Import形式
- Public Export形式
- Public JSON構造
- Build出力
- Registry契約
- 既存TRPG Editor
