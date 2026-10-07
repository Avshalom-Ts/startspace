# ADR 0025: Workspace-owned StartSpace data

Status: Accepted
Date: 2026-10-07
Related: [ADR 0002](0002-manifest-permissions-storage.md),
[ADR 0006](0006-portable-backup-format.md),
[ADR 0020](0020-shared-ui-search-and-data.md),
[ADR 0026](0026-link-description-fetching.md).

## Context

Tasks were stored at the workspace root while note sidecars lived under
`.startspace`; bookmark metadata lived in extension storage. The owner wants one
folder for workspace-owned application data and has already moved the task file.

## Decision

Use `.startspace/tasks.json`, `.startspace/note-identities.json`,
`.startspace/note-metadata.json`, and `.startspace/bookmark-metadata.json`.
The bookmark document is `{ "version": 1, "bookmarks": { ... } }`, keyed by
browser Bookmark ID, retaining favorites, tags, descriptions, timestamps and
relationship fields. Browser bookmarks themselves remain browser-owned.

Bookmark metadata has no browser-storage cache/fallback. Do not import existing
`startspace.bookmarkMetadata` data. Missing workspace permission disables metadata
features, not bookmark browsing, opening, creation or browser CRUD.

Reject malformed metadata; reread before mutation, serialize participating
writers using workspace-scoped browser locks, and check the disk baseline before
closing writes. Other tabs receive only refresh signals. Reload external edits
on focus or Retry. Clear stale state on workspace switches and disconnection.
Browser locks cannot coordinate native editors.

Read tasks from the new path. If only root-level `tasks.json` exists, tell the
user to move it into `.startspace`; do not silently create an empty board or
delete the original. When both files exist, the new path is authoritative.

Device config/preferences, directory handles, last-opened selection and crash
recovery remain in browser storage. User notes and images stay in their chosen
folders, not inside `.startspace`.

New backups use version 2 and contain bookmark metadata only as a workspace file.
Explicit version-1 restore converts root task paths and legacy extension
metadata to canonical workspace files; conflicting representations fail before
writing. Restore preserves unrelated destination files and device registration.

## Superseded decisions

This replaces bookmark extension-storage and root task-location rules in ADRs
0002, 0019 and 0020, the disconnected-favorites rule in ADR 0021, and version-one
export representation in ADR 0006. Other rules remain in effect.

## Consequences

- Favorites, tags, descriptions, recent links and relationships require workspace
  access. There is no disconnected metadata view.
- Metadata travels with the workspace, but browser IDs are profile-specific.
  No automatic cross-profile URL matching or ID remapping is implemented.
- Uninstalling does not delete the user's workspace metadata.
- Older builds cannot read the new task/metadata locations; returning to them
  requires a manual task move and explicit metadata conversion/restore.
