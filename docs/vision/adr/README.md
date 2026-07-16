# RELMUA Architecture Decision Records

Architecture Decision Records, or ADRs, record important technical and product
architecture choices.

Use ADRs when a decision changes one or more of:

- Data contract.
- Module ownership.
- Public generation.
- Studio authority.
- Build or publish flow.
- Migration policy.
- Plugin boundary.
- Client responsibility.

## Rule

Large design changes must be recorded here before or alongside implementation.

An ADR should explain why a decision was made, not only what changed.

## Template

```md
# Context

# Decision

# Alternatives

# Consequences
```

## Naming

Use a stable sequence and short title:

```text
0001-example-decision.md
0002-another-decision.md
```

## Relationship to Decision Log

The [Decision Log](../decision-log.md) is the chronological product history.

ADRs are detailed records for decisions that need deeper reasoning.

