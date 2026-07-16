# RELMUA v2 Preview Engine

Preview Engine lets users see changes before build.

It must be fast enough to use while editing.

## Purpose

Preview should answer:

- What will this look like?
- What content is missing?
- What route will this affect?
- What validation warnings matter before publish?

## Scope

Preview should support:

- Home
- Projects
- Creator
- TRPG
- Notes
- Theme

Preview should not require a full public build for every edit.

## Data Flow

```text
Editor state
    |
Normalize
    |
Validate
    |
Preview adapter
    |
Preview renderer
```

The same normalization and validation rules should be used by build.

## Theme Preview

Theme Editor changes should update Preview immediately.

Editable theme areas:

- Color
- Radius
- Typography
- Shadow
- Motion
- Spacing
- Layout

Theme preview must not mutate Public artifacts until build.

## Preview Integrity

Preview can be faster and more flexible than build, but it must not lie.

If a field would be excluded from Public, Preview should show that exclusion or
warn about it.

If validation blocks publish, Preview should show the reason.

## Client Boundary

Preview Engine should not be Tauri-only.

It should be usable by:

- Desktop Studio.
- Browser Admin where possible.
- Future PWA with reduced capabilities.

File system operations belong behind the bridge/backend, not inside Preview.

