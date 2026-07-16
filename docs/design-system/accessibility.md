# Accessibility

Accessibility is standard.

It is not an afterthought.

## Baseline

Minimum requirements:

- WCAG AA-level contrast.
- Visible focus-visible.
- Tab operation.
- Enter and Space activation.
- Escape for modal close.
- Label association.
- `aria-current` for current page.
- Modal focus trap.
- No color-only meaning.
- 44px equivalent touch target.
- `prefers-reduced-motion`.
- Meaningful screen reader structure.

## Focus

Focus-visible must never be removed.

If a component is interactive, keyboard users must be able to find it.

## Modals

Modal must:

- Move focus inside on open.
- Trap focus.
- Close with Escape when safe.
- Restore focus on close.
- Announce title and purpose.

## Color

State must not rely on color alone.

Use:

- Text.
- Icon.
- Shape.
- Border.
- Position.

## Touch

Mobile controls need enough size and spacing.

Do not place destructive action next to primary action without separation.

