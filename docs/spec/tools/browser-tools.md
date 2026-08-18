# Browser Tools Specification

Browser Tools are interactive RELMUA tools that run primarily in the browser.
They are different from the current Tools collection, which is a public catalog
of tool metadata and launch URLs.

## Ownership

Brand-wide tools belong under RELMUA Tools.

Creator-specific tools belong under the relevant Creator site. For example,
TRPG support tools for Chikage should live under Chikage's Creator area rather
than becoming global RELMUA navigation categories.

## Expected Directory Shape

Brand tools:

```text
apps/web/tools/
  index.html
  data/public-tools.json
  image-toolkit/
    index.html
    css/
    js/
```

Creator tools:

```text
apps/web/creators/chikage/trpg/tools/
  ccfolia-log-analyzer/
  character-palette-formatter/
```

The exact path can change during implementation, but the ownership rule cannot:
TRPG tools must stay Creator-scoped.

## Tool Catalog Contract

`public-tools.json` remains a catalog, not the complete implementation of a
tool.

Catalog records should describe:

- name.
- summary.
- category.
- launch URL.
- maintainer Creator IDs.
- tags.
- public status.

The catalog should not store user files, generated files, logs, images, or
private tool settings.

## Privacy Rule

Browser Tools should process files locally whenever possible.

The first implementation of these tools should not upload user input:

- Image Toolkit.
- CCFOLIA Log Analyzer.
- Character Palette Formatter.

Background Remover should prefer browser-side inference when feasible. If a
server-side model is ever introduced, the UI and docs must explain why upload is
needed and what is retained.

## Tool App Contract

Every interactive tool must declare:

- Owner: Brand or Creator.
- Route.
- Input types.
- Output types.
- Whether data leaves the browser.
- Maximum reasonable file size.
- Error states.
- Empty state.
- Keyboard and screen-reader affordances.
- Mobile layout behavior.
- Public catalog mapping.

## Implementation Rules

Use the existing static HTML/CSS/JavaScript architecture.

Use ES modules.

Render user-controlled text with:

- `createElement`.
- `textContent`.
- `replaceChildren`.

Do not render user-controlled tool output with `innerHTML`.

Large or CPU-heavy work should be isolated from the UI when practical:

- Web Worker for batch image work.
- Streaming or chunked parsing for large logs.
- Cancellation for long-running processing.
- Progress state for batch operations.

## Initial Brand Tool: Image Toolkit

Image Toolkit should group related image operations instead of splitting similar
tasks into many tiny tools.

Initial feature candidates:

- Resize.
- Convert.
- Compress.
- Rotate and flip.
- Metadata removal.
- Batch processing.
- Target file size.

Later feature candidates:

- Crop.
- Auto trim.
- Workflow presets.
- WebP and AVIF tuning.

MVP should start with a narrow but complete workflow rather than a wide list of
unfinished controls.

## Background Remover

Background Remover is related to Image Toolkit but may become a separate tool
because it has different performance, model, and privacy concerns.

Expected feature phases:

1. Color-based transparency.
2. Manual erase and restore.
3. Edge refine.
4. Auto trim.
5. Browser-side AI background removal, if feasible.
6. Background replacement.

If AI inference is added, the implementation must include:

- Model size budget.
- Loading state.
- Offline/browser compatibility behavior.
- Abuse and cost analysis if server-side inference is used.

## Chikage Tool: CCFOLIA Log Analyzer

This is a Creator-scoped TRPG support tool.

It should run in the browser and avoid uploading logs.

Expected analysis:

- Total roll count.
- Success count.
- Failure count.
- Critical count.
- Fumble count.
- Critical rate.
- Fumble rate.
- Per-player statistics.
- Per-skill statistics.
- Most rolled skills.
- Most criticals.
- Most fumbles.
- Message count.
- Shareable summary text.

The parser must treat logs as untrusted input.

## Chikage Tool: Character Palette Formatter

This is a Creator-scoped TRPG support tool.

Expected behavior:

- Normalize spacing.
- Remove duplicate lines.
- Sort by kana or skill value.
- Group by category.
- Normalize comments.
- Support CoC6 and CoC7 variants.
- Show before/after diff.
- Copy for CCFOLIA.

It should not require an account.

## Release Gates

Before a Browser Tool is promoted in navigation:

- It must be reachable through a stable route.
- It must be represented in the catalog or Creator page.
- Empty or experimental tools must not be promoted in Global Navigation.
- `sitemap.xml` and robots/noindex behavior must match public readiness.
- Basic mobile and desktop visual checks must pass.
- Large file and invalid input errors must be visible and recoverable.

