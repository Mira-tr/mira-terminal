# Studio Preview Specification

Preview shows the result before publishing.

Preview is not the source of truth.

## Inputs

Preview may use:

- Saved data.
- Draft state.
- Theme draft.
- Route draft.

## Output

Preview should show:

- Page title.
- Main content.
- Navigation context.
- Validation warning if the result cannot publish.

## Rules

- Preview must use shared validation and normalization.
- Preview must not write Public files.
- Preview must not hide publish-blocking errors.
- Preview should be available before final save when possible.

