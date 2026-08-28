# ADR 0003: Local Markdown Notes and Recursive Workspace Tree

**Status:** Accepted

**Date:** 2026-08-28

**Related:** ADR 0001 (Local-First, No-Backend Browser Extension), ADR 0002 (Extension Manifest, Permissions, and Storage Model)

## Context

StartSpace needs a Notes page that lets users create, edit, organize, import, search, and manage Markdown notes stored on their own computer. The feature must preserve the local-first architecture and must not introduce a separate notes database or a second folder hierarchy that can diverge from the user's files.

The Notes page also needs to make the selected workspace understandable and usable. Users should see the folder they selected on their computer, navigate nested folders, see notes within folders, and create new folders in the appropriate location. Because the File System Access API is permission-gated, the page must not present note functionality when the workspace is unavailable.

## Decision

### User-owned Markdown storage

- Notes are stored as real `.md` files inside the user-selected workspace directory.
- A note's identity is its relative path from the workspace root, such as `welcome.md` or `projects/roadmap.md`.
- The first Markdown H1 is used as the display title. If no H1 exists, the filename is used as the fallback title.
- The filesystem is the source of truth. The Notes page scans the workspace rather than maintaining a separate persistent note index.

### Real directory organization

- Folders are real directories inside the selected workspace.
- Folder creation, deletion, and note movement operate directly on those directories and files through the File System Access API.
- Empty folders are included in the scanned folder index so the tree reflects the actual workspace, not only folders containing notes.

### Recursive FolderTree

- The selected PC folder is displayed as the workspace root node using its actual directory name.
- All child folders are rendered recursively beneath their parent folders.
- Each folder can be expanded or collapsed.
- Notes directly contained in a folder are displayed beneath that folder.
- Root-level notes are displayed beneath the workspace root.
- Selecting a folder filters the main note list to notes directly inside that folder.
- Selecting a note from the tree opens that Markdown file in the Notes editor.
- Folder deletion remains available from each folder node and uses the existing recursive filesystem deletion behavior.

### Contextual folder creation

- The New folder input and action are displayed at the top of the FolderTree.
- When a folder is selected, a new folder is created inside that folder.
- When the root or All notes view is selected, a new folder is created directly in the workspace root.

### Workspace access and persistence

- Notes functionality is gated by an active workspace handle with `readwrite` permission.
- If the workspace is missing or inaccessible, the normal Notes UI is not rendered; the page provides a path to choose or reconnect the workspace through Settings.
- The selected `FileSystemDirectoryHandle` is persisted in IndexedDB so it can be recovered after reopening the tab or extension page.
- On startup, the persisted handle is checked with `queryPermission({ mode: 'readwrite' })`.
- If the browser returns `prompt`, the remembered handle is retained but Notes remains disabled until the user explicitly reconnects it. Reconnection calls `requestPermission()` on the remembered handle rather than requiring the user to browse for the directory again.
- The workspace name/reference remains extension metadata; note and folder contents remain in the user-owned workspace.

### Notes-specific search

- Search is owned by the Notes page rather than the homepage shell.
- Notes search runs against the loaded note index and matches both note titles and Markdown content.
- The homepage global search bar is not rendered on the Notes page.

## Consequences

### Positive

- Notes remain portable, inspectable, and editable in external Markdown tools.
- The UI accurately reflects the user's real filesystem hierarchy, including nested and empty folders.
- There is one source of truth for notes and folders: the workspace directory.
- Reopening StartSpace can recover the selected directory handle without requiring the user to pick the folder again in the normal case.
- Permission loss is explicit and recoverable without silently exposing an unusable Notes interface.
- Notes search is focused and does not overload the homepage search behavior.

### Trade-offs and constraints

- File System Access API support and permission behavior vary between browsers.
- A browser may require a user gesture to restore permission after reopening, even when the handle is persisted.
- Scanning the workspace is required to refresh the note and folder view; very large workspaces may require later performance improvements.
- External changes to files or directories are reflected after a refresh or another operation, not necessarily through real-time filesystem events.
- The Notes page currently filters notes directly within the selected folder; recursive aggregate folder counts and recursive folder filtering are not implied by this decision.

## Rejected alternatives

- **Store notes in extension storage:** rejected because it would make notes less portable, hide user content from normal filesystem tools, and conflict with the local-first workspace model.
- **Maintain a separate folder database:** rejected because it could diverge from the actual directories and would require synchronization logic.
- **Display only folders containing notes:** rejected because empty directories are still meaningful workspace organization and should remain visible.
- **Flatten the folder tree:** rejected because it obscures hierarchy and makes nested workspace organization harder to navigate.
- **Always reopen the directory picker after restart:** rejected because the persisted handle can identify the previous directory; when only permission must be renewed, requesting permission on that handle is a better user experience.
- **Use the homepage search bar on every page:** rejected because Notes search has different scope and semantics from homepage search.

## Recording

This ADR records the Notes page storage, workspace access, folder-tree, and search decisions. Implementation details may evolve, but changes that alter the source of truth, permission model, folder semantics, or page search ownership should update this ADR or create a superseding decision.
