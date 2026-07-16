# RELMUA Feature Review Checklist

Use this checklist before adding a new feature.

## Core

- [ ] Is this Data First?
- [ ] Is there one source of truth?
- [ ] Is the data contract clear?
- [ ] Is validation possible?
- [ ] Is backup possible?
- [ ] Is rollback possible?
- [ ] Is migration unnecessary, or clearly defined?
- [ ] Is module independence preserved?
- [ ] Is this understandable ten years from now?

## Public

- [ ] Does Public remain generated output?
- [ ] Does Public remain read-only?
- [ ] Does Public JSON compatibility remain intact?
- [ ] Does SEO or OGP need updates?
- [ ] Does sitemap or routing need updates?
- [ ] Does the change affect existing URLs?

## Studio

- [ ] Does Studio show current state clearly?
- [ ] Does Studio show validation results?
- [ ] Does Studio log important operations?
- [ ] Does Studio show automation reason, log, and result?
- [ ] Does the feature belong in Studio rather than Public?
- [ ] Does it preserve Browser Admin as a reduced client?

## Build and Diagnostics

- [ ] Does Build output change?
- [ ] Does Build manifest need updates?
- [ ] Does Diagnostics need a new check?
- [ ] Does Publish readiness change?
- [ ] Are errors classified correctly?

## Accessibility and UX

- [ ] Is accessibility considered by default?
- [ ] Is keyboard operation preserved?
- [ ] Is focus visible?
- [ ] Is contrast safe?
- [ ] Is mobile impact understood?
- [ ] Is the user shown what to do next?

## Security and Safety

- [ ] Are arbitrary shell commands avoided?
- [ ] Are arbitrary file writes avoided?
- [ ] Is Project Root escape prevented?
- [ ] Is vendor dependency replaceable?
- [ ] Are dangerous operations separated and confirmed?

## Final Question

- [ ] Does this make RELMUA easier to grow as a brand ten years from now?

