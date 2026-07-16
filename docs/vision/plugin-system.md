# RELMUA v2 Plugin System

Plugins extend capability.

Modules define content.

The two must not be confused.

## Plugin Role

A plugin can:

- Connect external services.
- Assist editing.
- Generate suggestions.
- Automate checks.
- Provide import/export helpers.
- Notify users.

A plugin must not:

- Become the canonical source of project data.
- Bypass validation.
- Write arbitrary paths.
- Run arbitrary commands without an explicit contract.
- Publish without Studio permission.

## Example Plugins

Possible plugins:

- AI assistant.
- Calendar connector.
- GitHub connector.
- OpenAI connector.
- Image optimizer.
- Link checker.
- Accessibility checker.

## Plugin Contract

Each plugin must define:

- pluginId
- displayName
- permissions
- readable domains
- writable domains
- actions
- safety level
- activity logging
- failure behavior

## Permission Model

Permission should be explicit.

Examples:

- Read public data.
- Read drafts.
- Suggest changes.
- Write drafts.
- Run diagnostics.
- Create backup.
- Request publish.

High-risk actions must require confirmation.

## AI as Plugin

AI is a plugin, not the operating system.

AI can help:

- Draft text.
- Summarize diagnostics.
- Suggest metadata.
- Review consistency.
- Generate candidate content.

AI must not:

- Write canonical data without preview.
- Skip validation.
- Invent public content as fact.
- Replace backup or migration.

## Plugin Failure Rule

If a plugin fails, RELMUA must remain usable.

Core editing, validation, backup, build, and publish cannot depend on a single
external plugin being available.

