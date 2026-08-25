# Architecture

Document the system once a technical approach is selected.

## Context

StartSpace is an open-source, local-first browser extension that replaces the browser's New Tab / Home page. It has no backend, no cloud service, no account, and no server dependency.

**Problem it solves:** gives the user a single browser homepage surface that searches and links their own data — browser bookmarks, local Markdown notes, and local Kanban tasks — with a configurable web search fallback, while keeping the browser and the user's filesystem as the source of truth.

**Constraints that shape the solution:**

- Runs entirely in the browser as an extension; no backend or cloud.
- Bookmarks come from the browser's Bookmark API; the browser is the source of truth for bookmark data.
- Notes are real Markdown files in a user-chosen workspace folder, accessible via the File System Access API and usable externally (VS Code, Obsidian).
- Tasks are local, workspace-stored, and linkable to notes and bookmarks.
- The extension is managed by the browser; the user chooses the workspace location on first launch.
- Initial version keeps scope narrow: no sync, no account, no collaboration, no PWA, no command palette.

## Components

### Browser Extension (Shell / Host)

- Replaces the browser's New Tab / Home page.
- Owns the navigation frame: Home · Links · Notes · Tasks · Settings · GitHub.
- Hosts the central search bar and search orchestration (Bookmarks → Notes → Tasks → Web).
- Manages extension lifecycle, permissions, and storage for StartSpace-specific metadata.
- On first launch, prompts the user to choose a workspace folder via the File System Access API.

### Search Bar (Central Entry Point)

- Single search input on the homepage.
- Search order: Bookmarks → Notes → Tasks → Web.
- Configurable web search engine as the final/fallback step.
- Searches note titles and content (not just titles).

### Bookmarks Module (Links)

- Uses the browser's Bookmark API.
- Browser is source of truth for: URL, Name, Folder structure, Bookmark ID.
- StartSpace metadata is linked by Bookmark ID: Favorites, Tags, Date added to StartSpace, Related notes/tasks.
- Provides the Links page for managing bookmarks from within StartSpace.
- Favorites are displayed on the homepage, backed by bookmark IDs.

### Notes Module

- Notes are normal Markdown (`.md`) files in the user's workspace.
- Operations: create, edit, delete, rename, move.
- Folder organization within the workspace.
- Import existing Markdown notes/folders; optionally use an existing Markdown folder directly as the workspace.
- Notes remain usable with external tools (VS Code, Obsidian, etc.).
- Search indexes both note titles and content.

### Tasks Module

- Local Kanban board.
- Tasks stored in the workspace.
- Tasks can be linked to Notes and Bookmarks (e.g., a task → related notes → related bookmarks).

### Workspace (User Data Layer)

- A folder chosen by the user on first launch (File System Access API).
- Contains the user's actual data: notes (Markdown), tasks, StartSpace configuration, and metadata.
- Does not depend on a server; the extension references it by reference, not by owning it.
- Backup/restore and export/import operate on the workspace.

### Import / Export / Backup

- Import existing Markdown notes.
- Export/import StartSpace configuration and metadata.
- Backup and restore the workspace.
- Supports migration to another computer.

### Distribution

- **Normal users:** Chrome Web Store / Firefox Add-ons → Install.
- **Developers:** GitHub → Clone/download → Build → Load Unpacked.
- The browser manages the extension's installation location; the user chooses the workspace location.

## Data and Request Flow

1. **First launch / workspace setup**
   - Extension loads; if no workspace is chosen, prompt the user via the File System Access API to select a folder.
   - The chosen folder becomes the workspace root for notes, tasks, config, and metadata.

2. **Homepage / navigation**
   - The extension renders the New Tab / Home page with navigation: Home · Links · Notes · Tasks · Settings · GitHub.
   - Home shows favorites (from bookmarks, by Bookmark ID) and the central search bar.

3. **Search flow**
   - User types in the central search bar.
   - Search proceeds in order: Bookmarks → Notes → Tasks → Web.
   - Notes search covers titles and content (Markdown files in the workspace).
   - If no local match, the configurable web search engine is used as fallback.

4. **Bookmarks flow**
   - StartSpace reads bookmarks via the browser's Bookmark API.
   - StartSpace metadata (favorites, tags, date added, related notes/tasks) is stored by StartSpace and linked to the bookmark by its Bookmark ID — the browser remains the source of truth for the bookmark itself.
   - The Links page allows managing bookmarks from within StartSpace.

5. **Notes flow**
   - Notes are read/written as Markdown files in the workspace via the File System Access API.
   - The Notes page UI provides a "New folder" action that creates a real directory in the workspace via `getDirectoryHandle(name, { create: true })`; nested folders are supported. Folders are ordinary directories on disk.
   - Folders organize notes; renaming and moving update the file system (extension-side rename/move is typically copy-and-swap, or the user can rename externally in their file manager / editor).
   - Import can bring in existing Markdown notes/folders; an existing folder can optionally serve directly as the workspace.

6. **Tasks flow**
   - Tasks are stored in the workspace and rendered as a local Kanban board.
   - Tasks can be linked to notes and bookmarks.

7. **Import / Export / Backup flow**
   - Export/import configuration and metadata.
   - Backup/restore the workspace folder contents.
   - Import Markdown notes from external sources.

## External Dependencies

- **Browser platform:** extension runtime, manifest, permissions model.
- **Browser Bookmarks API:** source of truth for bookmark data (URL, name, folder structure, bookmark ID).
- **File System Access API:** workspace folder access for notes, tasks, config, metadata, import/export/backup.
- **Web search engine:** configurable external web search used as the final step of the search order (user-configurable).
- **Distribution platforms (future):** Chrome Web Store / Firefox Add-ons for end-user installation.
- **Source control:** GitHub for source, builds, and developer load-unpacked flow.

## Change Log

| Date       | Change                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-08-25 | Initial architecture skeleton based on product definition.             |
| 2026-08-25 | Tech stack selected: TypeScript, React, Tailwind CSS, Vite, WebExt /  |
|            | Manifest V3, Browser Bookmarks API, File System Access API, Markdown  |
|            | notes (`.md`), `marked` for Markdown rendering, JSON for local        |
|            | metadata, Vitest + Playwright for testing, Bun as package manager,    |
|            | GitHub Actions for CI/CD, no backend.                                  |
| _Pending_  | Fill in manifest/permissions, storage model, and detailed data        |
|            | formats once implementation begins.                                    |
