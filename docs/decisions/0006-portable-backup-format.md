# ADR 0006: Portable backup and restore format

**Status:** Accepted  
**Date:** 2026-09-02

## Context

StartSpace stores notes and tasks in a user-selected workspace, while settings
and bookmark-linked metadata live in extension storage. Migration must preserve
both layers without adding a backend or requiring a proprietary archive tool.

## Decision

Settings exports one UTF-8 JSON file with `kind: "startspace-backup"` and
`version: 1`. It contains:

- the StartSpace config, bookmark-linked metadata, and light/dark preference;
- the workspace name and every workspace file as a relative path plus base64
  bytes, allowing Markdown, JSON, and arbitrary binary files to round-trip;
- the creation timestamp and StartSpace application version.

Restore validates the complete document, supported schema version, metadata
shape, base64 payloads, duplicate paths, and path traversal before writing. It
creates missing directories and overwrites paths represented in the backup. It
does not delete workspace files absent from the backup, so restore is a safe
merge rather than a destructive mirror.

The selected directory handle is not portable and is never serialized. The
user chooses or reconnects a workspace before restoring. Browser bookmarks are
also excluded because the Bookmark API remains their source of truth; only
StartSpace metadata keyed by Bookmark ID is exported.

The imported search-engine setting and metadata are restored, while the
destination's current workspace identity is retained. A backup must not point
the new installation back at a source-machine directory handle.

## Consequences

- One file carries both persistence layers and supports offline migration.
- Backups may be larger than compressed archives because binary data is base64.
- Bookmark IDs may differ between browser profiles, so imported metadata only
  reconnects where the browser preserves those IDs.
- Future formats must increment `version` and add an explicit migration before
  the parser accepts them. Unknown versions fail without writing files.
