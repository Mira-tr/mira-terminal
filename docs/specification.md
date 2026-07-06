# MIRA Terminal Specification

## Concept

MIRAの制作活動を管理・公開する統合プラットフォーム。

## Modules

### TRPG

TRPGシナリオ管理・検索機能。

Features:

- Scenario Management
- Tag Search
- Sort
- Status Management

### Game

ゲーム制作物管理。(予定)

### Tools

制作ツール公開。(予定)

---

# TRPG Admin

## Scenario Status

- draft (未整理)
- ready (整理済み)
- public (公開)
- private (非公開)

## Scenario Date

- title
- titleKana
- author
- system

- playersRaw
- playersMin
- playersMax

- timeRaw
- timeMin
- timeMax

- loss

- tags
- url

- status

- createdAt
- updatedAt

## Design Policy

- Module independent
- Mobile first
- Easy input