# Studio Modes Specification

Studio supports three visibility modes.

Modes do not change data rules.

## Mode Matrix

| Feature | Beginner | Standard | Advanced |
| --- | --- | --- | --- |
| Add | Visible | Visible | Visible |
| Edit | Visible | Visible | Visible |
| Save | Visible | Visible | Visible |
| Preview | Visible | Visible | Visible |
| Publish readiness | Visible | Visible | Visible |
| Validation summary | Human summary | Summary + details | Full detail |
| Diagnostics | Hidden unless blocking | Summary | Full detail |
| Backup state | Simple | Detailed | Full detail |
| Activity Log | Recent only | Filterable | Full detail/export |
| Git | Hidden | Read-only summary | Read-only detail |
| Manifest | Hidden | Hidden unless needed | Visible |
| Migration | Hidden | Guided only | Full tool |
| File paths | Hidden | Friendly destination | Actual paths |
| JSON | Hidden | Hidden | Optional view |

## Rule

Advanced mode may reveal complexity.

It must not bypass safety.

