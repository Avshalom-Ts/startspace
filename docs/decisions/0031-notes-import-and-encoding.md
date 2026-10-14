# ADR 0031: Notes import and encoding safety

Status: Accepted
Date: 2026-10-14
Related: [ADR 0003](0003-notes-page.md),
[ADR 0017](0017-notes-save-conflicts.md).

## Context

The filesystem service could import Markdown files, but the Notes layout no
longer exposed that operation. File access can also be revoked or a selected
folder can disappear. Finally, `File.text()` silently replaces malformed UTF-8
bytes, so reading or importing another encoding could cause a later save to
corrupt the original text.

## Decision

Expose a current-folder Markdown import action in the Notes list toolbar.
Imports never replace an existing file. Validate every selected Markdown file
as strict UTF-8 before creating its destination, then write the original bytes.
Reject other encodings with a conversion instruction and leave no destination
file behind.

Map a missing workspace root and File System Access permission failures to
clear reconnectable errors. Scan workspace entries sequentially but yield to
the browser after every bounded batch so large folders do not monopolize the
main thread.

## Consequences

The supported text format is explicitly UTF-8 Markdown. People can convert
legacy files before opening or importing them; StartSpace does not guess an
encoding or rewrite their source. Cooperative scanning favors responsiveness
over the lowest possible scan time. This does not add a folder-copy importer:
the person selects the Markdown files they want to copy into the current folder.
