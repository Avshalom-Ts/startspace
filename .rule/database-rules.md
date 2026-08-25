# Data and Persistence Rules

StartSpace has no traditional database in scope initially. "Persistent data" means three things:

1. **Browser bookmarks** — stored by the browser, read via the Bookmark API. The browser is the source of truth for URL, name, folder structure, and bookmark ID.
2. **Notes** — real Markdown (`.md`) files in the user's workspace folder, read/written via the File System Access API.
3. **Tasks** — workspace-stored data for the local Kanban board, linked to notes and bookmarks where relevant.
4. **StartSpace metadata and config** — StartSpace-specific data linked to bookmarks by Bookmark ID (favorites, tags, date added, related notes/tasks), plus extension configuration (e.g., chosen web search engine). Stored in extension storage or workspace files as decided during implementation.

## Rules

- Select and document the storage approach for StartSpace metadata and config before introducing persistent data beyond the browser's bookmark store and the workspace filesystem.
- Treat the browser's bookmark store as the source of truth for bookmark data; StartSpace metadata is derived and linked, not a replacement.
- Keep notes as ordinary Markdown files. Do not introduce a proprietary note format.
- Keep task storage in the workspace, aligned with the notes/workspace model, so the data stays local and portable.
- For StartSpace metadata and config, prefer reversible, serializable storage and document the chosen shape (extension storage vs workspace files) once selected.
- Treat migrations and schema changes to StartSpace metadata/config as the source of truth for those changes; prefer additive, reversible changes and test them against representative data.
- Document local bootstrap and seed-data instructions when a storage mechanism is added (e.g., how the workspace is created, how config is initialized on first launch).
- Never include production data, real bookmarks, real notes, or credentials in repository scripts, fixtures, or test data.
- Do not introduce a server, cloud database, or remote store — by design.

## When a database becomes relevant

If a future version introduces a need that the current model cannot meet (and the local-first philosophy is preserved), document the need, the chosen approach, and the migration plan before implementing it. Any such change should be recorded as an ADR in `docs/decisions/`.
