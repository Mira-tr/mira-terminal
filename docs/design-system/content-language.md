# Content Language

Language must help people decide.

Technical words need human explanations.

## Preferred Wording

| Technical | Human |
| --- | --- |
| Open | Open / 開く |
| Build | Assemble the public site / 公開サイトを組み立てる |
| Export | Create public data / 公開用データを作る |
| Publish | Publish the site / サイトを公開する |
| Validation | Check the input / 入力内容を確認する |
| Diagnostics | Find problems / 問題を探す |
| Backup | Save a restorable copy / 戻せるコピーを作る |
| Rollback | Restore previous state / 前の状態に戻す |
| Manifest | Build report / 組み立て結果の記録 |

## Studio Language

Studio should say what will happen.

Bad:

```text
Execute
```

Good:

```text
Create public data
```

## Public Language

Public should not mention internal systems.

Avoid:

- JSON.
- Build.
- Manifest.
- Schema.
- Registry.

Use visitor-facing language instead.

## Error Language

Error messages need:

1. What happened.
2. Why it matters.
3. What to do next.

