# Public Navigation Specification

Public navigation helps visitors understand where they are.

## Responsibilities

- Header.
- Footer.
- Current page state.
- Breadcrumb where useful.
- Related next page.
- Back to parent context.

## Rules

- Brand navigation must not expose creator module internals as global categories.
- Creator Sites must have a way back to RELMUA.
- TRPG must remain inside creator context.
- TRPGの書架・候補メーカー・ハウスルールはCreator内のサブナビで接続する。
- TRPG固有機能をBrandのToolsとして重複掲載しない。
- Every page should offer one main next step.

## 404

404 must:

- Explain that the page was not found.
- Offer Home.
- Offer one useful next route.
- Avoid technical error language.
