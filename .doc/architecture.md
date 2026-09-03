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

### Theme Module (Light / Dark)

- Light and dark mode, switchable from the header.
- Preference persisted in browser storage (``localStorage`` key ``startspace.theme``).
- Tailwind v4 CSS custom properties (``--color-page``, ``--color-surface``, ``--color-border``, ``--color-fg``, ``--color-muted``, ``--color-accent``, ``--color-accent-foreground``) swap values per theme via a ``[data-theme="dark"]`` selector.
- Applied at the root (``<html>``) via ``data-theme``; the UI reads the attribute on mount and on toggle.

### Notification Module

- An app-level React provider owns an in-memory queue of up to four messages
  and renders them in a fixed stack at the top-right of the viewport.
- Notes, Tasks, Links, and Settings use the same typed success, information,
  warning, and error API for transient operation outcomes.
- Success and informational messages dismiss automatically; errors remain until
  dismissed. Timers pause while a message is hovered or keyboard-focused.
- Field validation and persistent blockers remain inline beside the relevant
  control or page. Destructive actions continue to use confirmation dialogs.
- Notifications use accessible live-region roles, do not take focus, respect
  reduced-motion preferences, and are never persisted or sent outside the app.

### Search Bar (Central Entry Point)

- Single search input on the homepage.
- Search order and display groups: Bookmarks → Notes → Tasks → Web.
- Results render in a bounded, scrollable dropdown below the centered input. Arrow Up/Down cycles through results; Enter opens the active result or runs the web fallback when no result is active.
- Note and task results carry their relative note path or task ID in the hash route and open the exact selected item.
- Web fallback is selected from the allowlisted Google, Bing, DuckDuckGo, and Brave Search catalog stored in extension config.
- Searches note titles and content (not just titles).

### Bookmarks Module (Links)

- Uses the browser's Bookmark API.
- Browser is source of truth for: URL, Name, Folder structure, Bookmark ID.
- StartSpace metadata is linked by Bookmark ID: Favorites, Tags, Date added to StartSpace, Related notes/tasks.
- Provides the Links page for managing bookmarks from within StartSpace.
- Favorites are displayed on the homepage, backed by bookmark IDs.
- Creates, updates, moves, and deletes links and folders through a dedicated
  Bookmark API service; the Links UI never becomes a second bookmark store.
- Subscribes to bookmark mutation events and refreshes the displayed tree when
  changes originate in StartSpace or the browser bookmark manager.
- Preserves folder-chip navigation while storing its active path as Bookmark
  IDs, and cleans linked metadata after confirmed deletion.

### Notes Module

- Notes are normal Markdown (`.md`) files in the user's workspace.
- Persistent two-pane workspace: recursive filesystem explorer in the left pane and active Markdown editor or preview in the main pane.
- Operations: create, edit, delete, rename, and move notes; create, rename, and recursively delete folders.
- Folder rename copies all entries to a new sibling directory, then removes the original because the File System Access API has no native rename operation.
- Import existing Markdown notes/folders; optionally use an existing Markdown folder directly as the workspace.
- Notes remain usable with external tools (VS Code, Obsidian, etc.).
- Search indexes both note titles and content.

### Tasks Module

- Local Kanban board.
- Tasks stored in the workspace.
- Tasks can be linked to Notes and Bookmarks (e.g., a task → related notes → related bookmarks).

### Workspace (User Data Layer)

- A folder chosen by the user on first launch (File System Access API).
- Contains the user's actual workspace data: notes (Markdown), folders, and
  `tasks.json`. Configuration and bookmark-linked metadata remain in extension
  storage.
- Does not depend on a server; the extension references it by reference, not by owning it.
- Backup/restore spans workspace files and extension-owned state in one
  versioned local JSON export.

### Import / Export / Backup

- Import existing Markdown notes.
- Export/import StartSpace configuration and bookmark-linked metadata.
- Backup and restore every workspace file without deleting unrelated files.
- Supports migration to another computer.

### Distribution

- **Normal users:** Chrome Web Store / Firefox Add-ons → Install.
- **Developers:** GitHub → Clone/download → Build → Load Unpacked.
- The browser manages the extension's installation location; the user chooses the workspace location.
- GitHub Actions validates pull requests and `main` pushes. Semantic version
  tags build one ZIP, enter a protected production environment, upload through
  Chrome Web Store API v2, and publish automatically after store review.

## Data and Request Flow

1. **First launch / workspace setup**
   - Extension loads; if no workspace is chosen, prompt the user via the File System Access API to select a folder.
   - The chosen folder becomes the workspace root for notes, folders, and tasks.

2. **Homepage / navigation**
   - The extension renders the New Tab / Home page with navigation: Home · Links · Notes · Tasks · Settings · GitHub.
   - Home shows favorites (from bookmarks, by Bookmark ID) and the central search bar.

3. **Search flow**
   - User types in the central search bar.
   - Matching local groups appear in Bookmarks → Notes → Tasks order, followed by a Web result.
   - Arrow Up/Down selects a result in the dropdown; Enter opens that result. With no active selection, Enter opens the configured web search URL.
   - Notes search covers titles and content (Markdown files in the workspace).
   - Notes and Tasks changes publish an in-page workspace-change event, causing the search cache to reload.

4. **Bookmarks flow**
   - StartSpace reads bookmarks via the browser's Bookmark API.
   - StartSpace metadata (favorites, tags, date added, related notes/tasks) is stored by StartSpace and linked to the bookmark by its Bookmark ID — the browser remains the source of truth for the bookmark itself.
   - The Links page allows managing bookmarks from within StartSpace.

5. **Notes flow**
   - Notes are read/written as Markdown files in the workspace via the File System Access API.
   - The Notes page keeps the recursive explorer visible while editing or previewing the active note. It refreshes when the page regains focus and has a manual refresh action.
   - The New folder action creates a real directory via `getDirectoryHandle(name, { create: true })`; nested folders are supported. Folders are ordinary directories on disk.
   - Folders organize notes; renaming and moving update the file system. Folder rename uses copy-and-remove; notes are copied to their destination before their source is removed.
   - Import can bring in existing Markdown notes/folders; an existing folder can optionally serve directly as the workspace.

6. **Tasks flow**
   - Tasks are stored in the workspace and rendered as a local Kanban board.
   - Tasks can be linked to notes and bookmarks.

7. **Import / Export / Backup flow**
   - Export/import configuration, theme, and bookmark-linked metadata in a
     versioned JSON document.
   - Backup/restore every workspace file with validated relative paths and
     binary-safe base64 payloads. Restore overwrites included paths but does not
     delete unrelated workspace files.
   - Import Markdown notes from external sources.

## External Dependencies

- **Browser platform:** extension runtime, manifest, permissions model.
- **Browser Bookmarks API:** source of truth for bookmark data (URL, name, folder structure, bookmark ID).
- **File System Access API:** workspace folder access for notes, tasks, and
  import/export/backup.
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
| 2026-09-01 | Implemented a two-pane filesystem Notes workspace and central search   |
|            | dropdown with keyboard selection, exact note/task routing, and a       |
|            | predefined web-engine catalog stored in extension config.              |
| 2026-09-02 | Added a versioned, binary-safe JSON backup spanning workspace files and |
|            | extension-owned settings/metadata, with non-destructive restore.        |
| 2026-09-02 | Added shared, accessible top-right notifications for transient operation |
|            | feedback while preserving inline validation and persistent blockers.    |
| 2026-09-03 | Added GitHub Actions CI and protected, tag-driven Chrome Web Store API    |
|            | v2 delivery with matching GitHub release artifacts.                      |
