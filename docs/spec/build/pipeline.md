# Build Pipeline Specification

Build assembles public output from validated data.

## Pipeline

```mermaid
flowchart TD
    A["Load Canonical Data"] --> B["Normalize"]
    B --> C["Validate"]
    C --> D{"Critical Issues?"}
    D -->|Yes| E["Stop Build"]
    D -->|No| F["Generate Public JSON"]
    F --> G["Generate Static Files"]
    G --> H["Generate Sitemap"]
    H --> I["Check Canonical URLs"]
    I --> J["Copy CNAME"]
    J --> K["Write Build Manifest"]
```

## Requirements

- Validation runs before public generation.
- Critical issues stop publish-ready build.
- Public JSON excludes private/admin-only fields.
- Sitemap and canonical URLs use configured public origin.
- CNAME is preserved when configured.
- Admin files must not appear in dist.

