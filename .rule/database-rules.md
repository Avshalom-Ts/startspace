# Data and Persistence Rules

StartSpace has no traditional database in scope initially. Persistent data has these boundaries:

1. **Browser bookmarks** — stored by the browser, read via the Bookmark API. The browser is the source of truth for URL, name, folder structure, and bookmark ID.
2. **Notes** — real Markdown (`.md`) files in the user's workspace folder, read/written via the File System Access API.
3. **Tasks** — workspace-stored data for the local Kanban board, linked to notes and bookmarks where relevant.
4. **Workspace metadata** — `.startspace/bookmark-metadata.json` holds bookmark
   metadata keyed by profile-specific browser IDs; note sidecars and
   `.startspace/tasks.json` hold the remaining workspace-owned StartSpace data.
5. **Device state** — extension config stays in chrome.storage.local; theme and
   layout preferences use localStorage; directory handles, last-note selection,
   and unsaved draft recovery use IndexedDB.

## Rules

- Select and document the storage approach for StartSpace metadata and config before introducing persistent data beyond the browser's bookmark store and the workspace filesystem.
- Treat the browser's bookmark store as the source of truth for bookmark data; StartSpace metadata is derived and linked, not a replacement.
- Keep notes as ordinary Markdown files. Do not introduce a proprietary note format.
- Stable Note IDs and historical path aliases live in the versioned `.startspace/note-identities.json` workspace sidecar. Keep note bodies in Markdown, migrate legacy path-based task/bookmark edges without discarding missing targets, and preserve the sidecar in portable backups. Reject malformed or colliding identity metadata rather than overwriting it.
- Keep task storage in the workspace, aligned with the notes/workspace model, so the data stays local and portable.
- Use `.startspace` for workspace-owned StartSpace JSON. Do not duplicate
  bookmark metadata into extension storage or silently import old storage keys.
  Missing workspace permission means metadata is unavailable, not empty.
- Validate bookmark sidecars, reread before mutations, coordinate participating
  tabs with workspace-scoped locks, and signal refresh without sharing contents.
- Description fetches must not automatically overwrite any nonempty description.
  A completed fetch failure is visible, editable description text; permission
  denial or a disconnected workspace must not create failure entries.
- For StartSpace metadata and config, prefer reversible, serializable storage and document the chosen shape (extension storage vs workspace files) once selected.
- Treat migrations and schema changes to StartSpace metadata/config as the source of truth for those changes; prefer additive, reversible changes and test them against representative data.
- The browser's `startspace.workspace` IndexedDB store retains registered directory handles and random IDs plus a versioned last-opened relative note path per registration. A legacy current handle is assigned an ID on first load. Do not key note selection by folder name; unsaved note bodies are retained only in the separate device-local draft recovery record described in ADR 0014.
- Document local bootstrap and seed-data instructions when a storage mechanism is added (e.g., how the workspace is created, how config is initialized on first launch).
- Never include production data, real bookmarks, real notes, or credentials in repository scripts, fixtures, or test data.
- Do not introduce a server, cloud database, or remote store — by design.

## When a database becomes relevant

If a future version introduces a need that the current model cannot meet (and the local-first philosophy is preserved), document the need, the chosen approach, and the migration plan before implementing it. Any such change should be recorded as an ADR in `docs/decisions/`.
