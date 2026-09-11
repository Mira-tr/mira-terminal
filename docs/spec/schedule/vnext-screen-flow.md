# RELMUA Scheduler vNext Screen Flow

Status: **companion flow specification for `vnext-product-spec.md`**.

This document defines what the user sees, in what order, and what each action
means. It intentionally avoids exposing internal implementation objects unless
needed for engineering notes.

---

## 1. Top-level model

The entire Scheduler is understandable as four states:

```text
CREATE
候補を作る
   ↓
ANSWER
○△×で答える
   ↓
DECIDE
結果から決める
   ↓
CONFIRMED
確定した予定を見る
```

Dashboard is only a router into one of those states.

---

## 2. Route intent

Existing public routes and share links should remain compatible.

Recommended conceptual routes:

```text
/scheduler/
  Dashboard

/scheduler/?schedule=<id>
  Open account-owned schedule

/scheduler/#/join/<share_id>
  Shared participant entry, if current routing keeps hash form
```

Do not change public route syntax only to make vNext cleaner internally.
Compatibility comes first.

---

## 3. Dashboard

### Goal

Tell the user the **single next useful action** for each schedule.

### Priority order

```text
[回答が必要]
[決められます]
[次の確定予定]
[回答受付中]
[確定済み]
[履歴]
```

### Phone wireframe

```text
┌──────────────────────────────┐
│ SCHEDULER                    │
│ 日程を決める                 │
├──────────────────────────────┤
│ 要対応                       │
│                              │
│ VOID                         │
│ あなたの回答が必要           │
│                  [回答する]  │
├──────────────────────────────┤
│ 決められます                 │
│                              │
│ 狂気山脈                     │
│ 6/6 回答済み                 │
│                  [結果を見る]│
├──────────────────────────────┤
│ 次の予定                     │
│ 9/21 20:00–24:00             │
│ こゝろ                       │
├──────────────────────────────┤
│                  [＋ 日程を作る]
└──────────────────────────────┘
```

### Desktop wireframe

```text
┌───────────────────────────────────────────────────────┐
│ Scheduler                                ＋ 日程を作る │
├───────────────────────────────┬───────────────────────┤
│ 要対応                        │ 次の予定              │
│ VOID / 回答が必要             │ 9/21 20:00 こゝろ     │
│                               │                       │
│ 決められます                  │ 回答受付中            │
│ 狂気山脈 / 6 of 6             │ ...                   │
└───────────────────────────────┴───────────────────────┘
```

### Actions

- `回答する` → Answer screen.
- `結果を見る` → Decide screen.
- confirmed schedule row → Confirmed screen.
- `＋ 日程を作る` → Create screen.

---

## 4. Create: first screen

### Goal

Get to a shareable board with the minimum possible decisions.

### Phone wireframe

```text
┌──────────────────────────────┐
│ ← Scheduler                  │
│                              │
│ 日程を作る                   │
│                              │
│ 卓名 / イベント名            │
│ [________________________]   │
│                              │
│ 候補日時                     │
│                              │
│ ● まとめて入力               │
│ ○ カレンダーから選ぶ         │
│ ○ 期間から作る               │
│                              │
│ [候補を入力する]             │
└──────────────────────────────┘
```

Only title and candidate creation method are visually primary.

Advanced settings are a collapsed secondary control:

```text
[＋ プレイ時間などを設定]
```

---

## 5. Create: Quick paste

This is the default candidate-entry experience.

### Phone wireframe

```text
┌──────────────────────────────┐
│ 候補日時をまとめて入力       │
│                              │
│ 1行に1候補でも、まとめてもOK │
│                              │
│ ┌──────────────────────────┐ │
│ │9/18 20-24               │ │
│ │9/19 21-25               │ │
│ │9/21 13-18               │ │
│ └──────────────────────────┘ │
│                              │
│             [解釈して確認]   │
└──────────────────────────────┘
```

### Parse preview

```text
┌──────────────────────────────┐
│ この候補で合ってる？         │
│                              │
│ 9/18 Fri                     │
│ 20:00–24:00          [編集]  │
│                              │
│ 9/19 Sat                     │
│ 21:00–25:00          [編集]  │
│                              │
│ 9/21 Mon                     │
│ 13:00–18:00          [編集]  │
│                              │
│ [入力に戻る] [この候補を使う]│
└──────────────────────────────┘
```

### Parse error

Never silently drop a bad line.

```text
3行目を解釈できませんでした
「9/xx 夜」

[3行目を直す]
```

Parsed valid rows remain visible while the user fixes errors.

---

## 6. Create: Calendar select

### Phone behavior

- Month calendar.
- Tap date to select/unselect.
- Shared time appears below calendar.
- Selected dates appear as compact chips/list.

```text
┌──────────────────────────────┐
│ 2026年9月        ‹      ›    │
│ 日 月 火 水 木 金 土          │
│ ...                          │
│        [18] [19]             │
│ [20] [21]                    │
│                              │
│ 共通時間                     │
│ [20:00] ～ [24:00]           │
│                              │
│ 選択 3件                     │
│ 9/18 / 9/19 / 9/21          │
│                              │
│          [候補を確認]         │
└──────────────────────────────┘
```

Individual time overrides happen only after the shared selection is created.

---

## 7. Create: Generate from range

### User language

Avoid `Adjustment Window`.

```text
期間から候補を作る
```

### Wireframe

```text
期間
[9/15] ～ [9/30]

平日
[20:00] ～ [24:00]

土日
[13:00] ～ [18:00]

除外する曜日
[水]

[候補を作る]
```

Result returns to the same candidate preview used by Quick paste.

---

## 8. Create: final review

Before sharing, show one compact review.

```text
┌──────────────────────────────┐
│ VOID                         │
│                              │
│ 候補 12件                    │
│ 9/18 20:00–24:00            │
│ 9/19 21:00–25:00            │
│ ...                          │
│                              │
│ プレイ時間: 未設定           │
│ △: 使用する                  │
│                              │
│ [編集]                       │
│ [作成して共有URLを出す]      │
└──────────────────────────────┘
```

Do not ask the organizer to pre-register every participant.

---

## 9. Share success

Immediately after creation:

```text
できました

https://...
[コピー]

回答 0 / 0

[自分も回答する]
[結果を見る]
```

If Discord sharing support exists later, it is secondary to URL copy.

---

## 10. Shared entry: unknown visitor

### Goal

Get a guest into the answer UI with almost no friction.

```text
VOID
9/18〜9/30

回答するときの名前
[________________]

[回答をはじめる]

──────────
Discordでログイン
アカウントの予定を使う場合はこちら
```

Guest is primary.
Account login is an enhancement.

---

## 11. Answer screen — phone

This is the most important vNext screen.

```text
┌──────────────────────────────┐
│ VOID                         │
│ 千景として回答中             │
│                              │
│ 3 / 12 回答                  │
│                              │
│ [全部○] [全部△] [全部×]      │
├──────────────────────────────┤
│ 9/18 Fri                     │
│ 20:00–24:00                  │
│                              │
│ [ ○ ] [ △ ] [ × ]           │
├──────────────────────────────┤
│ 9/19 Sat                     │
│ 21:00–25:00                  │
│                              │
│ [ ○ ] [ △ ] [ × ]           │
│        時間を指定 →          │
├──────────────────────────────┤
│ ...                          │
├──────────────────────────────┤
│ 保存済み                     │
│                  [回答完了]  │
└──────────────────────────────┘
```

### Rules

- Candidate row never opens a modal for normal ○/△/× selection.
- Buttons remain in the same left-to-right order everywhere.
- Selected state includes symbol/text/check state, not just color.
- Save state stays visible but visually quiet.

---

## 12. `△` time detail

Only opens when requested.

```text
9/19 Sat 21:00–25:00
△ 条件つきで参加

参加できる時間
[22:00] ～ [25:00]

[＋ 時間帯を追加]

メモ（任意）
[終業次第]

[閉じる]
```

The parent answer remains `△`.
Detailed ranges refine the recommendation engine.

---

## 13. Answer screen — desktop

Desktop can show more candidates at once but should preserve the phone model.

Preferred layout:

```text
┌─────────────────────────────────────────────────────┐
│ VOID                         回答 8 / 12  保存済み   │
│ [全部○] [全部△] [全部×]                            │
├──────────────┬──────────────┬───────────────────────┤
│ 9/18 Fri     │ 20:00–24:00  │   ○     △     ×      │
│ 9/19 Sat     │ 21:00–25:00  │   ○    [△]    ×      │
│ 9/21 Mon     │ 13:00–18:00  │  [○]    △     ×      │
└──────────────┴──────────────┴───────────────────────┘
```

Do not replace the answer screen with the organizer's aggregate matrix.

---

## 14. Answer complete

After all candidates have an answer:

```text
回答しました

12 / 12 回答済み
あとからこのURLを開けば変更できます。

[回答を見直す]
```

For account users, optional dashboard return is available.

---

## 15. Owner collection state

Before all answers arrive:

```text
VOID
回答受付中

4 / 6人 回答済み

未回答
- A
- B

いまの有力候補
9/21 20:00–24:00
3○ / 1△ / 0×

[結果を見る]
[候補を追加]
[共有URLをコピー]
```

If participant list is open-ended guests rather than pre-registered members,
progress should not pretend the denominator is known. In that case show answer
count only.

---

## 16. Decide screen — phone

The result starts with recommendations, not the full table.

```text
┌──────────────────────────────┐
│ VOID / 結果                  │
│                              │
│ BEST                         │
│ 9/21 Mon                     │
│ 20:00–24:00                  │
│ 全員○                        │
│                              │
│              [この日に決定]  │
├──────────────────────────────┤
│ NEXT                         │
│ 9/23 Wed                     │
│ 20:00–24:00                  │
│ 5○ / 1△                     │
│ Aさんは22:00から参加可能     │
│                              │
│              [この日に決定]  │
├──────────────────────────────┤
│ [回答表を見る]               │
└──────────────────────────────┘
```

### Recommendation card requirements

Always show:

- date/time,
- viability summary,
- reason,
- explicit confirm action for owner.

Never show only a score such as `87 points`.

---

## 17. Full response matrix — desktop

```text
             9/18      9/19      9/21
             20-24     21-25     20-24
千景           ○          △          ○
A              ○          ○          ○
B              ×          ○          ○
C              ○          △          ○
────────────────────────────────────────
○              3          2          4
△              0          2          0
×              1          0          0
```

The best column is highlighted semantically but remains readable without color.

Phone must not display this as a compressed tiny table.

---

## 18. Full response detail — phone

```text
回答表

9/21 Mon 20:00–24:00
4○ / 0△ / 0×

千景  ○
A     ○
B     ○
C     ○

────────────
9/19 Sat 21:00–25:00
2○ / 2△ / 0×
[参加者を見る]
```

This is the mobile equivalent of the matrix.

---

## 19. Multi-session decide screen

When relevant, `組み方候補` appears above individual-date alternatives.

```text
12時間を3回に分ける場合

組み方 A
全員○

1. 9/21 20:00–24:00
2. 9/23 20:00–24:00
3. 9/28 20:00–24:00

合計 12時間
[この3日で決定]
```

```text
組み方 B
1件△

1. 9/19 21:00–25:00
2. 9/21 20:00–24:00
3. 9/23 20:00–24:00

Aさん: 初日のみ22:00から
[詳細] [この3日で決定]
```

Do not show internal plan IDs or score formulas.

---

## 20. Confirmation dialog

Confirmation is intentionally explicit.

```text
この日程で確定しますか？

9/21 20:00–24:00

回答者へ見える予定として確定します。

[戻る] [確定する]
```

For multiple sessions, list every date.

---

## 21. Confirmed screen

```text
VOID
日程確定

9/21 Mon
20:00–24:00

[Calendarで見る]

────────────
回答
6人

[回答表を見る]

────────────
主催者
[日程を変更]
[中止]
```

If there are multiple sessions:

```text
SESSION 1  9/21 20:00–24:00
SESSION 2  9/23 20:00–24:00
SESSION 3  9/28 20:00–24:00
```

Preparation, if kept, appears after confirmed scheduling information and is not
part of the main confirmation hierarchy.

---

## 22. Candidate change after responses

### Organizer action

`候補を追加 / 編集` from collection or decide state.

### Result

Participants are not forced to redo unchanged answers.

User-facing message:

```text
候補が更新されました
新しい2件だけ回答してください。
```

Dashboard label:

```text
再回答が必要
```

Do not make the participant understand rounds.

---

## 23. Re-answer screen

Only changed/new candidates appear first.

```text
VOID
候補が更新されました

未回答 2件

9/26 ...  [○] [△] [×]
9/28 ...  [○] [△] [×]

────────────
[以前の回答も見る]
```

Existing unaffected answers remain saved.

---

## 24. Empty and error states

### No schedules

```text
まだ日程はありません。

候補日時を入れるだけで始められます。
[＋ 日程を作る]
```

### Invalid share URL

```text
この共有URLは使えません。
期限切れか、共有が停止されています。
```

Do not expose internal IDs or RPC errors.

### Offline/save error

```text
保存できませんでした
回答はこの画面に残っています。
[もう一度保存]
```

Never clear a dirty answer draft after a network failure.

---

## 25. Authentication transitions

### Guest flow

```text
share URL
→ display name
→ answer
→ guest credential remembered locally
→ reopen URL
→ same answer is editable
```

### Account flow

```text
Dashboard or share URL
→ Discord login
→ return to same scheduling intent
```

Auth return must preserve only safe same-origin intent as in the existing
runtime.

If a guest later logs in, account-linking behavior is a separate explicit flow.
Do not silently merge identities.

---

## 26. Navigation rules

### Global Scheduler navigation

- Back from Create → Dashboard.
- Back from Answer on share URL → shared schedule landing / safe close state,
  not owner Dashboard for unauthenticated guest.
- Back from Decide → owner collection state / Dashboard.
- Confirmed → Calendar link is secondary but obvious.

### Browser history

Opening detail screens should produce sensible Back behavior.
Do not require full page reload to escape internal views.

---

## 27. Screen ownership by role

| Screen | Owner | Account participant | Guest |
| --- | ---: | ---: | ---: |
| Dashboard | yes | yes | no |
| Create | yes | optional if product allows | no |
| Shared landing | yes | yes | yes |
| Answer | yes | yes | yes |
| Decide | yes | read-only optional | read-only optional |
| Full matrix | yes | read-only based on privacy | read-only based on privacy |
| Confirm | yes | no | no |
| Confirmed | yes | yes | yes through share policy |

Privacy policy remains governed by DB/RLS and existing public-view rules.

---

## 28. Component contract

The first implementation should converge onto these conceptual components:

```text
SchedulerDashboard
CreateSchedule
CandidateInput
CandidatePreview
SharedScheduleLanding
AnswerList
AnswerRow
PartialTimeEditor
CollectionSummary
RecommendationList
RecommendationCard
ResponseMatrix
MultiSessionPlans
ConfirmedSchedule
SaveStatus
```

Components are conceptual. Do not force a framework migration to achieve them.
The current static HTML / ES Module architecture remains valid.

---

## 29. Recommended implementation order

Do not rebuild the whole Scheduler in one PR.

### Slice 1 — Answer vNext

```text
Shared landing
→ compact ○△× answer list
→ bulk answer
→ △ time detail
→ save status
```

Preserve current persistence and guest flows.

### Slice 2 — Candidate Quick paste

```text
textarea
→ deterministic parser
→ preview
→ existing slot persistence
```

### Slice 3 — Create shell + calendar/range modes

All modes output the same candidate draft structure.

### Slice 4 — Decide vNext

```text
recommendation cards
→ reason text
→ unanswered summary
→ responsive matrix
→ confirm
```

### Slice 5 — Multi-session `組み方候補`

Reuse / adapt existing recommendation engine.

### Slice 6 — Advanced account helpers

Availability, cross-schedule busy, calendar, reminders.

---

## 30. Definition of done for the redesign

The vNext redesign is not done because every old control exists in a new skin.
It is done when:

1. a guest can answer without explanation,
2. an organizer can paste many candidates without repetitive forms,
3. the best date is obvious without manually counting symbols,
4. partial-time answers remain available without cluttering the simple path,
5. multi-session TRPG scheduling is stronger than a generic date poll,
6. existing saved schedules and share URLs continue to work.
