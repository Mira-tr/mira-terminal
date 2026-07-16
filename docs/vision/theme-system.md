# RELMUA v2 Theme System

Theme is part of brand operation.

It should be editable without scattering hard-coded values across pages.

## Theme Domains

Theme Editor should eventually manage:

- Color
- Radius
- Typography
- Shadow
- Motion
- Spacing
- Layout

## Theme Flow

```text
Theme Editor
    |
Theme data contract
    |
Validation
    |
Preview
    |
Build
    |
Public output
```

## Theme Contract

Theme data must define:

- schemaVersion
- token groups
- allowed values
- default fallback
- public mapping
- preview mapping
- validation rules

## Design Safety

Theme editing must protect:

- Contrast.
- Focus visibility.
- Readability.
- Touch targets.
- Motion reduction.
- Dark mode.
- Light mode.

## Public Rule

Public should receive generated theme output.

Public should not contain Studio-only theme editor state.

## Future Compatibility

Theme data should not assume only one web surface.

It should be usable by:

- relmua.com
- Creator Sites
- Preview
- PWA
- Desktop shell where appropriate

Creator Sites may have separate theme layers, but they should still follow the
same contract style.

