# RELMUA Scheduler vNext Product Specification

Status: **UX/product design source of truth for the next Scheduler rebuild**.

This document supersedes the current Scheduler UI model where internal concepts
such as rounds, candidates, availability, recommendation, and preparation can
surface too early in the interaction.

It does **not** supersede the current database contracts in `db-v1.md`.
The first implementation should reuse the existing data model wherever possible
and change the product surface before adding schema.

---

## 1. Product definition

RELMUA Scheduler is a scheduling service for answering one question:

> **When can this group actually play?**

For the Chikage TRPG surface, it competes with general date-coordination tools,
but should be better for tabletop sessions that have a required duration,
late-night play, multi-session completion, and participants with partial time
availability.

The public product is **not** a scenario manager and must not couple Scenario
Library / Picker selection to schedule creation.

### User-facing promise

```text
候補を出す。
みんなが答える。
一番いい日を決める。
```

Everything else is progressive enhancement.

---

## 2. Product principles

### 2.1 Zero-explanation first use

A new user who has never seen RELMUA should be able to answer a shared schedule
without reading help text.

The default participant interaction is only:

```text
名前 → ○ / △ / × → 完了
```

### 2.2 Progressive disclosure

Simple users see a simple scheduler.
Advanced scheduling features appear only when they solve a concrete problem.

Examples:

- `△` may expand into a time-range editor.
- `候補を追加` may expose bulk paste and generator tools.
- Multi-session recommendations appear only when required duration exceeds a
  practical single-session duration or the organizer explicitly requests them.

### 2.3 Guest-first participation

Basic response must not require an account.

Account benefits are additive:

- reusable availability,
- cross-schedule busy detection,
- Discord identity,
- calendar integrations,
- saved defaults.

### 2.4 Organizer speed beats configuration completeness

Creating a usable board should take seconds, not a wizard full of settings.

Minimum creation input:

- title,
- candidate dates/times.

TRPG-oriented optional input:

- required play time,
- preferred session length,
- response deadline.

### 2.5 Mobile is the primary response device

The participant answer screen is designed for one-handed phone use first.
Desktop gets a denser matrix and comparison view, but never a different product
model.

### 2.6 Internal concepts stay internal

The following may remain implementation terms but should not be primary UI
vocabulary:

- round,
- candidate,
- availability model,
- recommendation engine,
- completion plan,
- stale response.

User-facing equivalents:

| Internal | User-facing |
| --- | --- |
| Round | 候補の更新 / 再回答 |
| Candidate | 候補日時 |
| Availability | 空いている時間 |
| Recommendation | おすすめ |
| Completion Plan | 組み方候補 |
| Stale response | 再回答が必要 |

---

## 3. Interaction patterns to borrow

The product should deliberately borrow proven interaction patterns without
copying another service's visual design.

### From Densuke-style tools

- No-account guest participation.
- One table/list containing everyone and every candidate.
- Immediate recognition of `○ / △ / ×`.
- Low ceremony around sharing a URL.

### From Chouseisan-style tools

- Candidate dates can be entered quickly instead of individually opening a full
  form for each one.
- The result surface makes strong dates visually obvious.
- Simple aggregate scoring is understandable before advanced recommendations.

### From Doodle / Rallly-style polling

- `Yes / If needed / No` maps naturally to `○ / △ / ×`.
- Participants should be able to answer from the shared URL with minimal setup.
- Organizer confirmation is a separate, explicit final action.

### From calendar-first scheduling tools

- Calendar clicking is useful for visual selection.
- Connected-calendar free/busy can later reduce manual answers.
- Calendar integration is an accelerator, never a requirement for basic use.

### RELMUA-specific advantage

General poll tools stop at "this date works".
RELMUA may understand:

- required total play time,
- preferred session length,
- cross-midnight time such as `25:00`,
- partial availability inside a candidate,
- multiple confirmed sessions,
- multi-session combinations that complete the event.

---

## 4. Core user journeys

### Journey A: Organizer creates a board quickly

```text
卓名を入力
  ↓
候補日時を入れる
  ↓
プレビュー確認
  ↓
共有URLを出す
```

No participant setup is required before sharing.

### Journey B: Guest answers

```text
共有URLを開く
  ↓
表示名
  ↓
各候補に ○ / △ / ×
  ↓
保存完了
```

A user may add time detail only when needed.

### Journey C: Organizer decides

```text
回答が集まる
  ↓
おすすめ上位を見る
  ↓
必要なら回答表を見る
  ↓
日時を確定
```

### Journey D: Multi-session event

```text
必要時間を設定
  ↓
各候補への回答が集まる
  ↓
「組み方候補」を見る
  ↓
2日 / 3日などのセットを確定
```

---

## 5. Create experience

The current large creation/configuration experience is replaced with a compact
creation surface.

### 5.1 Required fields

- `卓名 / イベント名`
- at least one candidate date/time

### 5.2 Optional quick settings

Collapsed by default:

- required total time,
- preferred one-session time,
- timezone,
- response deadline,
- allow / disallow `△`.

Default timezone for the Chikage TRPG surface is `Asia/Tokyo`.

### 5.3 Candidate input modes

The same canonical slot list can be populated by three front-end tools.

#### Mode A: Quick paste — default

A textarea accepts rough human input.

Examples that should be accepted:

```text
9/18 20:00-24:00
9/19 21:00-25:00
9/21 13:00-18:00
```

```text
9/18, 9/19, 9/21 20:00-24:00
```

```text
9/18 20-24
9/19 21-25
```

```text
9/18
9/19
9/21
```

For date-only lines, the UI must ask for / apply an explicit default time. It
must not silently invent a time.

Parser requirements:

- normalize full-width punctuation where safe,
- support `/`, `-`, `〜`, `~`, and common separators,
- support cross-midnight `24:00` to `30:00` within current DB limits,
- detect duplicate slots,
- show unresolved lines instead of dropping them,
- never save until the normalized preview is accepted,
- preserve original input during correction,
- make parser output deterministic and unit-testable without DOM.

The preview is the truth:

```text
入力
  ↓
解釈結果
  [9/18 Fri 20:00–24:00]
  [9/19 Sat 21:00–25:00]
  [9/21 Mon 13:00–18:00]
  ↓
この候補で作る
```

#### Mode B: Calendar select

For users who prefer visual selection:

- tap/click dates,
- apply a shared start/end time,
- edit an individual date after selection,
- remove a date with one action.

Calendar mode writes into the same normalized candidate draft as Quick paste.
Switching modes must not lose existing candidates.

#### Mode C: Generate from a range

Advanced but highly useful for TRPG.

Example input:

```text
期間: 9/15–9/30
平日: 20:00–24:00
土日: 13:00–18:00
除外: 水曜
```

The system generates candidates, then returns to the normal preview where the
organizer can remove or edit dates.

This mode should be labeled around the user's goal, not around internal window
rules.

Suggested label:

`期間から候補を作る`

### 5.4 Candidate management after creation

The organizer may:

- add candidates,
- edit date/time,
- remove candidates,
- restore a recently removed candidate when safe,
- reorder only when meaningful.

Adding or changing candidates after responses exist must clearly identify which
participants need to answer the new/changed candidates.

Do not show `Round` as a primary UI object.

---

## 6. Participant answer experience

### 6.1 Default phone layout

Each candidate is a compact row/card:

```text
9/18 Fri
20:00–24:00

[ ○ ] [ △ ] [ × ]
```

The selected state must be obvious through more than color alone.

### 6.2 Bulk actions

When multiple candidates exist, expose compact bulk actions:

- `全部○`
- `全部△`
- `全部×`
- `未回答を×` or equivalent only when explicitly confirmed

Useful optional helpers when dates span weekdays/weekends:

- `平日を○`
- `土日を○`

Bulk actions must be reversible before save and must not destroy detailed ranges
without confirmation.

### 6.3 `△` detail

Selecting `△` does not force a form open.

A small affordance such as `時間を指定` allows:

```text
21:00からなら参加可
23:00までなら参加可
20:00–22:00だけ可
```

This maps onto existing `schedule_response_ranges`.

### 6.4 Notes

Notes are optional and visually secondary.

Examples:

- `仕事次第`
- `22時からなら○`

The answer value remains the primary signal. A note must never be required to
use `△`.

### 6.5 Save behavior

Answers should autosave or batch-save with a clear state:

- `未保存`
- `保存中`
- `保存済み`
- `保存できませんでした`

Mobile navigation away from dirty state must not silently discard changes.

### 6.6 Guest identity

Guest participation requires only a display name plus the existing schedule-
scoped guest credential.

The device should remember its guest credential for that schedule so reopening
the URL edits the same response rather than creating another participant.

---

## 7. Result and decision experience

The organizer should see **the conclusion before the matrix**.

### 7.1 Recommendation tiers

Use explainable tiers instead of an opaque numeric score.

#### Best

```text
9/21 20:00–24:00
全員○
```

#### Strong

```text
9/23 20:00–24:00
5人○ / 1人△
```

#### Adjustable

```text
9/19 21:00–24:00
1人が22:00からなら参加可能
```

#### Not viable

Dates with required `×` responses stay available in the full matrix but should
not compete visually with viable recommendations.

### 7.2 Ranking rules

For a single session, rank primarily by:

1. all required participants can attend,
2. number of `○`,
3. fewer `△`,
4. fewer unknown responses,
5. time-range overlap covers required session minutes,
6. organizer preference / future preference rules.

The UI always shows reason text, not only score.

### 7.3 Full response matrix

The Densuke-style matrix remains available below / behind `回答表を見る`.

Desktop:

- participants as rows or columns depending on width,
- candidate totals pinned near each candidate,
- horizontal overflow is contained within the matrix, never the whole page.

Phone:

- do not shrink a desktop table,
- show one candidate at a time or stacked candidate summaries,
- participant detail can expand on demand.

### 7.4 Unknown participants

Always make unanswered people explicit:

```text
回答 4 / 6
未回答: A, B
```

Owner actions may later include reminder delivery, but reminder transport is a
separate feature from the core decision UI.

---

## 8. Multi-session scheduling

Multi-session scheduling is a major RELMUA differentiator but must stay out of
the basic path until relevant.

### Trigger

Show `組み方候補` when either:

- organizer requests multiple sessions, or
- required total minutes cannot fit comfortably into one candidate.

### Inputs

Use plain product language:

- `必要な合計時間`
- `1回あたりの目安`
- optional `最低 / 最大` session length
- optional `何日以内に終えたい`
- optional `連日を避ける / 同じ曜日を優先`

### Output example

```text
組み方 A — 全員○
9/21 20:00–24:00
9/23 20:00–24:00
9/28 20:00–24:00
合計 12h
```

```text
組み方 B — 1件△
9/19 21:00–25:00
9/21 20:00–24:00
9/23 20:00–24:00
合計 12h
```

The organizer confirms the set, producing multiple existing confirmed-session
rows.

The term `Completion Plan` may remain internal.

---

## 9. Confirmed state

After confirmation the primary surface becomes deliberately quiet.

Show:

- confirmed date/time,
- participant answer summary,
- share link,
- change / cancel actions for the organizer.

If multiple sessions are confirmed, show them in sequence.

Calendar remains the read-only place for seeing confirmed sessions across
schedules.

Preparation remains optional functionality after confirmation and must not be
required to understand scheduling.

---

## 10. Public information architecture

The Scheduler itself should be reducible to four user-facing states.

```text
CREATE
候補を作る

ANSWER
○△×で答える

DECIDE
結果から決める

CONFIRMED
確定した予定を見る
```

A dashboard can list many schedules, but opening one always lands in the state
that needs the user's attention.

### Dashboard priority

1. `回答が必要`
2. `決定待ち` for owner
3. `次の確定予定`
4. `回答受付中`
5. `確定済み`
6. history

Internal preparation tasks may surface separately after the scheduling product
is stable.

---

## 11. State model

Suggested product states mapped onto existing richer storage:

```text
draft
  ↓
collecting
  ↓
ready_to_decide
  ↓
confirmed
```

Side states:

- changed → returns affected users to collecting/re-answer state,
- cancelled,
- completed,
- expired.

`round` remains a revision mechanism, not a product destination.

---

## 12. Existing implementation reuse

The current DB v1 already supports most of the first rebuild without destructive
migration.

| vNext need | Existing storage |
| --- | --- |
| Schedule / board | `schedules` |
| Candidate date/time | `schedule_slots` |
| Guest or account person | `schedule_participants` |
| ○△× answer | `schedule_responses` |
| Partial time answer | `schedule_response_ranges` |
| One or multiple confirmed sessions | `schedule_confirmed_slots` |

DB v1 already treats `schedule_slots` as stable candidate records and supports
cross-midnight minute fields. Therefore the first vNext implementation should
change candidate **input and presentation**, not replace slot identity.

### Existing systems to preserve initially

- Supabase Auth for organizer/account users,
- guest token flow,
- shared `share_id`,
- yes/maybe/no persistence,
- response ranges,
- existing confirmed session model,
- current recommendation engine calculations where correct,
- current personal availability model behind advanced/account flows.

### Existing systems to hide or demote

- Round management as a top-level UI,
- raw candidate composer complexity,
- personal Availability as a prerequisite for answering,
- Recommendation terminology,
- Preparation in the core scheduling path.

---

## 13. Migration strategy

### Phase 0 — Contract tests first

Before replacing UI, write tests for:

- existing share URLs,
- existing guest credential recovery,
- current stored yes/maybe/no responses,
- current response ranges,
- confirmed slots,
- existing schedule deep links.

### Phase 1 — Participant answer rebuild

Highest value / lowest schema risk.

Deliver:

- compact mobile answer rows,
- bulk ○△×,
- optional `△` time detail,
- explicit save state,
- unanswered progress.

No DB migration expected.

### Phase 2 — Organizer candidate input rebuild

Deliver:

- Quick paste parser,
- normalized preview,
- calendar selection,
- range generator,
- candidate edit/remove.

Persist into existing `schedule_slots`.

No DB migration expected unless later audit finds a missing immutable revision
field.

### Phase 3 — Decide screen rebuild

Deliver:

- recommendation tiers,
- reason labels,
- unanswered participant summary,
- responsive full matrix,
- explicit confirm action.

Reuse current calculation modules where possible; isolate new ranking into DOM-
free modules with tests.

### Phase 4 — Multi-session plans

Expose current completion-plan concepts as `組み方候補`.

Schema changes are allowed only if the existing confirmed-slot and runtime plan
model cannot safely represent proposed-but-not-yet-confirmed sets.

### Phase 5 — Connected availability

Later:

- saved weekly availability,
- cross-schedule busy,
- calendar free/busy,
- reminder integrations.

These features must never make guest/manual scheduling harder.

---

## 14. Parser contract for Quick paste

The parser is a standalone module and must return structured results, warnings,
and errors.

Suggested shape:

```js
{
  slots: [
    {
      localDate: "2026-09-18",
      startMinute: 1200,
      endMinute: 1440,
      sourceLine: 1
    }
  ],
  warnings: [],
  errors: []
}
```

Rules:

- Parse against an explicit timezone and reference year.
- If year is omitted near year boundaries, preview the resolved year clearly.
- Never silently roll an invalid date.
- `25:00` means next-day 01:00 while retaining the local-date scheduling label.
- Start/end must follow the existing 0–30:00 bounds.
- Deduplicate only when normalized date/start/end are identical.
- Preserve line references for error highlighting.

The parser must not perform database writes.

---

## 15. Accessibility and mobile acceptance

### Answer screen

- Each candidate's `○ / △ / ×` is reachable and labeled by keyboard and screen
  reader.
- Selected state is not color-only.
- Touch targets are at least comfortable mobile control size.
- 30 candidates remain practically answerable without opening 30 dialogs.
- No page-wide horizontal overflow.

### Create screen

- Quick paste remains usable without calendar interaction.
- Calendar selection remains usable without drag gestures.
- Parse errors identify their source line.

### Decide screen

- Recommendation order is meaningful in DOM order.
- Reason text is readable without hover.
- The response matrix has an accessible non-color representation of answers.

---

## 16. Success criteria

The rebuild is successful when these scenarios are true.

### First-time guest

A guest can open a URL, enter a name, answer ten candidates, and understand that
the answer was saved without documentation.

### Fast organizer

An organizer can paste ten candidate lines, confirm the preview, and share the
board without editing ten individual forms.

### TRPG partial-time case

A participant can answer `△` and express `22:00からなら可` without turning every
other answer into a time-range form.

### Decision case

An organizer can identify the best candidate without manually counting the full
matrix.

### Multi-session case

For a 12-hour event, the organizer can see a suggested 3 × 4-hour combination
and understand why it is recommended.

---

## 17. Explicit non-goals for the first rebuild

Do not block the rebuild on:

- Google Calendar OAuth,
- Discord reminder delivery,
- cross-schedule busy synchronization,
- paid plans,
- scenario-library integration,
- AI parsing,
- admin operational UI,
- replacing Supabase.

Quick paste parsing should be deterministic code first. AI may later be an
optional helper, never the only way to interpret candidate input.

---

## 18. Implementation rule

When implementation begins, optimize in this order:

```text
participant response friction
→ organizer candidate-entry friction
→ decision clarity
→ advanced TRPG scheduling
→ integrations
```

Do not begin by rebuilding every current feature into the new UI.
A feature earns a visible place only if it helps create candidates, answer them,
or decide the result.
