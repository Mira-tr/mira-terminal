# Token Architecture

Tokens are the shared language of the Design System.

Components must use semantic tokens.

Raw color values should not be scattered across components.

## Primitive Tokens

Primitive tokens describe raw values.

Examples:

- `color.green.900`
- `color.ink.900`
- `spacing.4`
- `font-size.16`
- `line-height.1.7`
- `radius.4`
- `shadow.1`
- `duration.150`

Primitive tokens do not describe meaning.

## Semantic Tokens

Semantic tokens describe purpose.

Examples:

- `text-primary`
- `text-muted`
- `surface-page`
- `surface-card`
- `border-default`
- `action-primary`
- `action-danger`
- `state-success`
- `state-warning`
- `state-error`
- `focus-ring`

## Theme Rule

Light and Dark must keep the same semantic token names.

Only values change.

Example:

| Token | Light Meaning | Dark Meaning |
| --- | --- | --- |
| `surface-page` | Page background. | Page background. |
| `text-primary` | Main text. | Main text. |
| `action-primary` | Primary action. | Primary action. |

The meaning must not change between themes.

## Surface Token Layers

Use layers:

1. Primitive.
2. Semantic.
3. Surface-specific semantic.

Example:

```text
color.ink.900 -> text-primary -> brand.text-primary
```

## Token Rule

Components should not say:

```text
background: #123456
```

They should say:

```text
background: var(--action-primary)
```

