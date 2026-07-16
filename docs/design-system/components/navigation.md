# Navigation

## Purpose

Navigation prevents users from getting lost.

## Components

- Header.
- Footer.
- Sidebar.
- Breadcrumb.
- Tabs.

## States

- Default.
- Hover.
- Active.
- Focus-visible.
- Current.
- Disabled.

## Keyboard

- Links are links.
- Tabs use tab semantics only when switching panels.
- Enter activates links.
- Arrow behavior only for true tabs when implemented.

## Accessibility

- Use `aria-current` for current page.
- Do not use `aria-pressed` for navigation links.
- Avoid `tabindex=-1` except managed focus cases.

## Brand Public

Shows current page and next destination.

## Creator Public

Shows creator context and route back to RELMUA.

## Studio

Shows workspace, module, breadcrumb, state, and Terminal return.

Creator and Brand navigation must not mix ownership.

