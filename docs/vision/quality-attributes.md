# RELMUA Quality Attributes

This document ranks the quality attributes RELMUA optimizes for.

## 1. Maintainability

RELMUA must be understandable years later.

The most important quality is that future maintainers can see why data, modules,
validation, and public generation are shaped the way they are.

## 2. Recoverability

Creative work must be recoverable.

Backup, rollback, migration reports, and activity logs are not optional extras.
They protect the brand archive.

## 3. Reliability

Publishing must be calm and repeatable.

Validation, build, diagnostics, and generated output should behave predictably.

## 4. Extensibility

New creators, modules, plugins, and clients should fit the architecture without
rewriting the core.

Extension must happen through registries, contracts, and adapters.

## 5. Accessibility

Accessibility is required for both Public and Studio.

Keyboard operation, readable contrast, semantic structure, and focus visibility
are baseline quality.

## 6. Usability

Public should be easy to explore.

Studio should make daily production work obvious, safe, and efficient.

## 7. Security

The system must prevent unsafe operations:

- Arbitrary shell commands.
- Arbitrary path writes.
- Project Root escape.
- Unreviewed import overwrite.
- Public leakage of private fields.

## 8. Portability

RELMUA should avoid deep dependency on one vendor or runtime.

Studio, Browser Admin, PWA, and Public should share data contracts where
possible.

## 9. Performance

Public must stay lightweight and fast.

Studio should be responsive enough for daily use, but performance must not be
improved by weakening validation or safety.

## 10. Offline Support

Offline support is valuable, especially for Studio and future PWA.

It ranks after core safety because offline behavior must not create hidden data
conflicts or unsafe publish states.

