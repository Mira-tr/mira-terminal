# RELMUA TRPG v2 Visual System

Last updated: 2026-08-22

This document fixes the first TRPG v2 visual direction. It is scoped to Chikage
TRPG first, then can expand to Chikage, RELMUA Home, Projects, Tools, and Notes.

## Positioning

RELMUA is the entrance and platform. Chikage TRPG is the first completed v2
experience inside that platform.

TRPG v2 must feel like:

```text
Quiet Japanese mood
Dark editorial website
Interactive portfolio
Modern app UI
```

The entrance is a work. The inside is a tool.

## Visual Intensity

| Surface | Intensity | Rule |
| --- | ---: | --- |
| TRPG Home | 10 | Typographic, atmospheric, memorable. |
| Chikage Home | 9 | Personal, character-led, still navigable. |
| My Sessions | 6 | App-like, row-based, quietly premium. |
| Session Detail | 5 | Clear state and member information. |
| Scheduler | 4 | Fast answer flow and large tap targets. |
| Admin | 3 | Dense, calm, operational. |

## Color

TRPG v2 does not need Light/Dark switching. The dark surface is the identity.

Core tokens:

| Token | Value | Use |
| --- | --- | --- |
| `--trpg-v2-ink` | `#111513` | Page canvas, never pure black. |
| `--trpg-v2-ink-deep` | `#090d0c` | Deep bands and hero depth. |
| `--trpg-v2-indigo` | `#142835` | Structural panels, navigation. |
| `--trpg-v2-indigo-soft` | `#274253` | Active lines, quiet controls. |
| `--trpg-v2-paper` | `#eee4d1` | Main text and important headings. |
| `--trpg-v2-paper-muted` | `#bfb4a2` | Body copy and metadata. |
| `--trpg-v2-line` | `rgba(238, 228, 209, 0.2)` | Hairlines and dividers. |
| `--trpg-v2-brass` | `#b98c5a` | Warm accent for anchors and numbers. |
| `--trpg-v2-violet` | `#b7a2df` | Rare state accent only. |
| `--trpg-v2-danger` | `#db8b83` | Error and unavailable states. |

Forbidden shortcuts:

- Pure black page fill as the only mood.
- Neon purple gradients.
- Glass blur as a default surface.
- One-note blue/purple dashboards.
- Card grids as the default layout.

## Typography

Display:

- Japanese serif first: `"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP",
  Georgia, serif`.
- Use for `卓`, `記録`, `千景`, section anchors, and large editorial titles.
- Letter spacing stays `0`.

Functional:

- System sans first: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
  sans-serif`.
- Use for controls, row metadata, counts, and forms.

Mono-like labels:

- Use system monospace for time, index, and state codes.
- Keep labels compact and uppercase where English improves scan.

Typography rules:

- TRPG Home may use viewport-sized type and partial overflow.
- App surfaces must use readable type scales and stable line-height.
- Japanese copy is not secondary decoration; it carries the emotional voice.
- English labels provide rhythm and metadata.

## Spacing And Grid

Mobile first:

- Page gutters: 16px.
- Major vertical rhythm: 64px between editorial sections.
- Operational rhythm: 18-24px between app blocks.
- Tap targets: 44px minimum, 56px preferred for primary schedule choices.
- Rows use top borders and deliberate whitespace instead of card outlines.

Desktop expansion:

- Max reading width: 760px.
- Max app width: 1120-1240px.
- Home can use two-column asymmetry.
- Sessions can expand into sidebar + active panel.
- Calendar can show month + agenda side by side.

## Navigation

Mobile:

- Keep global and creator navigation available, but TRPG v2 app navigation uses
  a bottom dock.
- Bottom dock items: Home, Sessions, Schedule, Rules, More.
- One screen equals one task.
- Use bottom sheets for secondary actions.

Desktop:

- Expand the bottom dock into a rail or top/side split.
- Show overview and detail together only when it improves scanning.
- Do not create a separate desktop product.

## Components

Preferred components:

- Editorial rows.
- Hairline section dividers.
- Compact metadata rails.
- Large schedule choice buttons.
- Segmented controls for mode switching.
- Bottom sheets for mobile secondary work.
- Status dots and short text labels together.

Use cards only for:

- Repeated item groups that truly need framing.
- Modals and sheets.
- Focused app panels.

Do not put cards inside cards.

## Motion

Default timings:

- Microinteraction: 160-220ms.
- Page/section reveal: 240-360ms.
- Important confirmation: 700-1100ms.

Allowed motion:

- Fade.
- Translate.
- Mask reveal.
- Text reveal.
- Line draw.
- Bottom-sheet transition.
- Row activation.
- Character state reaction.

Rules:

- Motion must explain state, direction, or completion.
- Respect `prefers-reduced-motion`.
- Avoid layout shift.
- Avoid pointer-only effects on mobile.
- Keep animation running on transforms and opacity where possible.

## Character Integration

Two roles:

```text
Life-size Chikage = show Chikage
Mini Chikage = working Chikage
```

Life-size Chikage:

- Hero.
- Creator identity.
- TRPG Home key visual.
- Editorial transitions.

Mini Chikage:

- Loading.
- Saving.
- Success.
- Error.
- Empty state.
- Scheduler.
- Admin.
- Bot Control.

Mini Chikage state model:

```text
idle -> action -> reaction -> idle
```

Minimum future states:

- `idle`
- `reading`
- `writing`
- `saving`
- `success`
- `error`
- `sleepy`
- `bot`

The prototype may use placeholders only. Assets must be replaceable without
rewriting layout or app state.

## Mobile Home Screen Specification

First screen:

- Small origin label: `CHIKAGE / TRPG`.
- Large editorial words: `PLAY. RECORD. REMEMBER.`
- Giant Japanese type, preferably `卓`.
- A quiet character/key-visual plane.
- Next hint visible below the fold.

Content order:

1. Hero.
2. My Sessions preview.
3. House Rules.
4. Scenario Library.
5. TRPG Tools.
6. Future Bot / Account note.

Do not render this as a card menu. It should read as one editorial page with
app-like entry points.

## Desktop Expansion Rules

- Hero becomes a split editorial composition, not a split text/card layout.
- My Sessions preview can sit beside an agenda rail.
- Rows may gain extra metadata columns.
- Scheduler preview may show candidate and answer state together.
- Character visual can become a larger atmospheric plane.
- Bottom navigation becomes a restrained local rail or stays as an anchored dock
  if it feels better.

## Prototype Acceptance

The first prototype is acceptable when:

- Existing Scenario Library behavior remains unchanged.
- Mobile first viewport feels designed, not squeezed.
- The page is not dominated by purple, cards, or glass.
- Text does not overlap at 390px or 1440px.
- Motion respects reduced-motion preferences.
- It can be reviewed independently at a stable route.

