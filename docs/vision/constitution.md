# RELMUA Constitution

This is the constitution of RELMUA as a Brand OS.

It contains absolute design principles only.

## Principle 1: Data First

Data comes before UI.

UI can be replaced.

Data is the long-term asset.

## Principle 2: Public is Generated

Public surfaces are generated outputs from Studio and canonical data.

Public must not be directly edited as the source of truth.

## Principle 3: Single Source of Truth

Every domain has one canonical source.

Double management is forbidden.

Compatibility layers may exist during migration, but they must not become a
second permanent truth.

## Principle 4: Migration Required

Schema changes require migration.

Old data must not be discarded because a new UI is easier to build.

Migration must be explicit, testable, and reversible where possible.

## Principle 5: Backup Before Write

Risky writes require backup first.

The user must be able to recover the previous state.

## Principle 6: Validation Before Publish

Content that fails critical validation must not be published.

Publishing is a result of passing quality gates, not a button that bypasses
them.

## Principle 7: Accessibility by Default

Accessibility is a default requirement, not a later improvement.

Keyboard operation, readable contrast, semantic structure, and clear focus must
be considered part of the product baseline.

## Principle 8: Independent Modules

Modules must not depend strongly on each other.

Shared foundations are allowed.

Hidden cross-module coupling is not.

## Principle 9: Visible Automation

Automation must be visible to the user.

It must show:

- Reason.
- Log.
- Result.

Invisible automation that changes project state is not acceptable.

## Principle 10: Human First

Studio is built for humans, not for AI.

AI can assist, suggest, summarize, and review.

Humans remain responsible for decisions, confirmation, and publication.

## Principle 11: 10 Year Compatibility

Every new feature must be judged by whether it can still be understood and
maintained five and ten years later.

Short-term convenience must not become long-term debt.

## Principle 12: Studio First

Studio is the primary production environment.

Browser Admin is a supporting surface for emergency work, light editing, review,
and future PWA flows.

Browser Admin is not the full replacement for Studio.

## Principle 13: Everything Recoverable

Unrecoverable operations are forbidden.

Rollback must be assumed from the start.

## Principle 14: Vendor Independent

RELMUA must not depend too deeply on one vendor.

OpenAI, GitHub, hosting providers, and other services must remain replaceable
through contracts and adapters.

## Principle 15: Brand OS

RELMUA is not a website.

RELMUA is a brand operating foundation.

Web pages, Creator Sites, Studio, PWA, and Desktop App are surfaces of the same
Brand OS.

