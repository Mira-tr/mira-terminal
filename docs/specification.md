# MIRA Terminal Specification

## Concept

MIRAの制作活動を管理・公開する統合プラットフォーム。

目的：

- 制作物管理
- 情報整理
- 公開ページ生成
- 制作活動の集約

---

# Modules

## TRPG

TRPGシナリオ管理・検索機能。

Features:

- Scenario Management
- Tag Search
- Filter
- Sort
- Status Management
- Backup
- Public View

---

## Game

ゲーム制作物管理。(予定)

---

## Tools

制作ツール公開。(予定)

---

# TRPG Admin

管理者用編集システム。

## Features

- Create Scenario
- Edit Scenario
- Delete Scenario
- Duplicate Input
- Detail Modal
- Dashboard
- Import / Export
- Public Export
- Public Quality Warning
- Keyword / Status / System / Tag Filter
- Public Warning Filter

---

# Scenario Status

| value | 意味 |
|-|-|
| draft | 未整理 |
| ready | 整理済み |
| public | 公開 |
| private | 非公開 |

---

# Rating

年齢区分。

| value | 意味 |
|-|-|
| all | 全年齢 |
| r18 | R18 |
| r18g | R18G |

---

# Scenario Data

```js
{
    id,

    title,
    kana,

    author,
    system,

    playersRaw,
    playersMin,
    playersMax,

    timeRaw,
    timeMin,
    timeMax,

    loss,
    rating,

    scenarioType,
    series,
    summary,
    notes,

    tags,

    url,
    storageLocations,
    storageNote,
    memo,

    status,

    createdAt,
    updatedAt
}
```

---

# JavaScript Architecture

MIRA Terminal は ES Modules を使用し、
機能単位で責任分離する。

目的：

- 保守性向上
- 機能追加の容易化
- Public画面への再利用
- 将来的なAPI / DB化への対応

---

## Core

基本制御。

```text
js/

├ app.js
├ store.js
└ utils.js
```

### app.js

Role:

- Application Initialize
- Module Connection
- Event Binding

### store.js

Role:

- localStorage Access
- Data Save / Load

### utils.js

Role:

- Common Utility Functions

---

# Features

機能単位モジュール。

```text
features/

├ dashboard.js
├ tags.js
├ authors.js
├ backup.js
└ scenarios/
```

---

## dashboard.js

Role:

- Scenario Count
- Status Summary

---

## tags.js

Role:

- Tag Management
- Tag Select
- Tag Create / Delete

---

## authors.js

Role:

- Author Management
- Author Suggest
- Author Delete

---

## backup.js

Role:

- Export Data
- Import Data

---

# Scenario Modules

シナリオ関連処理。

```text
scenarios/

├ scenarioStore.js
├ scenarioForm.js
├ scenarioList.js
├ scenarioFilter.js
├ scenarioModal.js
└ scenarioUtils.js
```

---

## scenarioStore.js

Role:

- Scenario Data Management
- CRUD

Functions:

- Create
- Read
- Update
- Delete

---

## scenarioForm.js

Role:

- Input Form Control

Functions:

- Save Scenario
- Edit Scenario
- Duplicate Input

---

## scenarioList.js

Role:

- List Rendering

Functions:

- Scenario Card Create
- Display Update
- Event Connection

---

## scenarioFilter.js

Role:

- Search / Filter / Sort

Current:

- Keyword Search
- Status Filter
- System Filter
- Tag AND Filter
- Public Warning Filter
- Sort

Future:

- Player Filter
- Time Filter
- Rating Filter
- Reset All Filters

---

## scenarioModal.js

Role:

- Detail View

Functions:

- Scenario Detail Display
- Delete Action

---

## scenarioUtils.js

Role:

- Common Scenario Utilities

Example:

- Rating Text Convert

---

# Storage

## Current

Browser Storage:

- localStorage

保存対象:

- Scenario Data
- Tags
- Authors

---

## Future

Server Storage:

- API
- Database

想定：

- User Account
- Cloud Sync
- Public Share

---

# Design Policy

## UI / UX

Policy:

- Mobile First
- Simple Input
- Low Click Count
- Search First Design
- Responsive Layout

---

## Code

Policy:

- ES Modules
- Independent Modules
- Responsibility Separation
- No Inline Event Handler
- Reusable Components

禁止:

- Large Single File
- Direct onclick
- Duplicate Logic

---

# Future Roadmap

## TRPG

予定:

- Admin Filter Reset
- Unsaved Edit Warning
- Duplicate Scenario Warning
- Public Search State URL
- Automated UI Smoke Test

---

## Platform

予定:

- Game Portfolio
- Tools Release
- Creator Profile
