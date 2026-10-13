# ADR 0027: Explicit legacy bookmark-link import

Status: Accepted
Date: 2026-10-13
Related: [ADR 0015](0015-stable-note-identities.md), [ADR 0025](0025-workspace-owned-startspace-data.md).

## Context

Older StartSpace builds kept bookmark metadata in extension storage. Current
builds keep metadata in `.startspace/bookmark-metadata.json`, but saved
bookmark-to-note relationships need a deliberate migration path.

## Decision

The Notes information pane lets a person link or unlink only bookmarks that
exist in the current browser profile, using browser Bookmark IDs. When legacy
extension metadata has saved note relationships, the pane offers an explicit
**Import saved bookmark links** action. The import is never automatic.

The importer merges only `relatedNotes` into the workspace bookmark sidecar.
It converts matching note paths to stable Note IDs, preserves unresolved note
references for later relinking, skips stale browser Bookmark IDs, deduplicates
relationships, and retains existing workspace metadata. Favorites, tags,
descriptions, timestamps, and other legacy extension fields are not imported.

## Consequences

The user chooses the workspace receiving the migration, so importing cannot
silently write metadata into an unrelated folder. Bookmark IDs remain
browser-profile-specific; relationships for bookmarks absent from the current
profile remain in the old extension metadata and are not copied.
