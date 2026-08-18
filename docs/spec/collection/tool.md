# Tool Collection Specification

Tool can be a Collection Type when a tool needs structured content.

Brand Tools can also remain a simpler public data domain when no collection is
needed.

## Fields

Tool-specific fields may include:

- category.
- launch URL.
- internal path.
- supported input.
- supported output.
- status.
- usage note.

## Validation

- `category`: required when public.
- `internal path`: required when public tool is hosted inside RELMUA; `./` or
  `../` only.
- `launch URL`: required when public tool is external; http or https only.
- `status`: draft, private, public, archived.
- `usage note`: optional, 0-500 characters.

## Public Rule

Public must show only tools that are safe and public.

If there are no public tools, show an editorial empty state instead of fake
tools.

## Interactive Tools

Interactive browser tools are specified separately in
[Browser Tools](../tools/browser-tools.md).

The Collection record is a catalog entry. It must not become the place where a
tool stores user files, generated files, private settings, or processing output.
