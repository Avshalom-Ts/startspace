# ADR 0005: Browser-Backed Link and Folder CRUD

**Status:** Accepted

**Date:** 2026-09-02

**Related:** ADR 0001 (Local-First, No-Backend Browser Extension), ADR 0002 (Extension Manifest, Permissions, and Storage Model)

## Context

The Links page already reads and navigates the browser bookmark tree using a row of folder chips and a link-card grid. Users need to create, edit, move, and delete links and folders without leaving StartSpace. These operations must preserve the browser as the source of truth and remain synchronized with changes made in the browser's bookmark manager.

StartSpace metadata such as favorites, tags, and note/task relations is stored separately in extension storage and keyed by Bookmark ID. Deleting bookmark nodes can leave orphaned metadata unless the mutation flow cleans it up.

## Decision

- StartSpace performs link and folder CRUD through the browser Bookmark API using the existing `bookmarks` permission. It does not copy bookmark data into workspace files or another database.
- A bookmarks service is the mutation boundary for `create`, `update`, `move`, `remove`, and recursive `removeTree` calls.
- The live tree hook subscribes to bookmark-created, changed, moved, and removed events and reloads the tree after local or external changes.
- The existing folder-chip navigation and back-arrow interaction remain. Navigation stores Bookmark IDs internally so refreshed browser objects do not make the current view stale.
- New-link and new-folder forms select an explicit parent folder from a nested
  tree representing the browser's real bookmark hierarchy. Editing uses the
  same tree to move a link or folder.
- Browser-owned root containers can receive children but cannot be renamed, moved, or deleted by StartSpace.
- A folder cannot be moved into itself or one of its descendants.
- Confirmed deletion removes StartSpace metadata for the deleted link or every recursively deleted descendant.
- Browser failures are normalized to concise, actionable UI errors.

## Consequences

### Positive

- Changes made in StartSpace are immediately visible in the browser bookmark manager and vice versa.
- Bookmark identity remains stable across edits and moves, preserving linked metadata.
- No new permissions, backend, account, or data store are introduced.
- Existing Links navigation remains familiar.

### Trade-offs and constraints

- Bookmark API behavior and protected-root rules remain browser-dependent.
- Recursive deletion is destructive in the browser bookmark store and cannot be undone by StartSpace.
- A metadata-cleanup failure can leave harmless orphaned metadata for later pruning.
- External changes trigger a full tree reload rather than incremental patches.

## Rejected alternatives

- **Store managed links in workspace JSON:** rejected because it creates a second source of truth.
- **Replace folder-chip navigation with a tree sidebar:** rejected because the existing interaction is intentionally retained.
- **Optimistically mutate the React tree:** rejected because browser validation and external events can disagree with speculative state.
- **Allow editing browser-owned roots:** rejected because browsers protect these nodes.

## Recording

Changes to bookmark ownership, mutation APIs, root protections, synchronization, or deletion cleanup should update this ADR or create a superseding decision.
