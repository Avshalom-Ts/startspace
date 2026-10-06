# Getting Started

Use this page to set up StartSpace and start using it, whether you're an end user installing from a store or a developer building from source.

## What StartSpace Is

StartSpace is an open-source, local-first browser extension that replaces your browser's New Tab / Home page. It gives you a single homepage with a central search bar that searches across your bookmarks, Markdown notes, and local tasks, with a browser-default web search fallback. There is no backend, account, cloud service, or vendor lock-in.

Your browser bookmarks stay in the browser (the browser is the source of truth). Your notes are real Markdown files in a workspace folder you choose. Your tasks are local and linkable to notes and bookmarks.

## End-User Installation

StartSpace has not been published to an extension store yet. For the MVP, use
the developer installation below.

### Chrome / Chromium

Store installation will be documented after a listing is published.

### Firefox

Firefox is not supported by the MVP because its File System Access API support
does not currently provide the required workspace flow.

## Developer Installation (Build from Source)

Follow this path if you want to build StartSpace from source, contribute, or load an unpacked extension for testing.

### Prerequisites

- Bun (the project's package manager).
- A Chromium-based browser (Chrome, Chromium, Edge, etc.) for testing initially. Firefox support is planned but may have API differences (see `.doc/glossary.md` and `.doc/architecture.md`).
- Git to clone the repository.
- Node.js is not required separately if Bun manages the runtime; use Bun for installs and scripts.

### Clone and Build

```bash
git clone https://github.com/Avshalom-Ts/startspace.git
cd startspace
bun install
bun run build
```

The build type-checks the source, creates a Vite/WebExtensions Manifest V3
bundle, and verifies that the required manifest, New Tab page, service worker,
and icons exist. A successful command prints
`Verified load-unpacked extension in dist/.`

### Development Workflow

- Make changes to the TypeScript/React source.
- Run the dev server / build as configured (`bun run dev` or `bun run build` per the project's scripts).
- Reload the unpacked extension in the browser's extension management page.
- Test in the New Tab page and other extension pages.

### Formatting, Linting, and Tests

- Format and lint changed code before handoff (TypeScript with strict typing as the primary safety net, plus the project's formatter and linter configured in `.rule/coding-rules.md`).
- Run unit tests with Vitest and browser/extension-page tests with Playwright as configured.
- Do not include real bookmarks, real notes, or real workspace contents in test data (see `.rule/testing-rules.md`).

### Load Unpacked

1. Open your browser's extension / add-on management page:
   - Chrome: `chrome://extensions/`
   - Firefox: `about:debugging` → "Load Temporary Add-on" (or the equivalent)
2. Enable **Developer mode** if required.
3. Choose **Load unpacked** and select the repository's generated `dist/`
   directory.
4. Open a new tab. The manifest installs StartSpace as the New Tab page.

On first launch, StartSpace will prompt you to choose a workspace folder.

### Repository Structure

The project is a TypeScript + React + Tailwind CSS browser extension built with Vite and WebExtensions / Manifest V3. Expected top-level areas:

- Extension source (manifest, background/service worker, extension pages such as the New Tab / Home page, shared libraries).
- React UI components and pages (Home, Links, Notes, Tasks, Settings, GitHub).
- Styling via Tailwind CSS with a shared `tailwind.config.ts`.
- Markdown rendering via `marked` where note content is rendered in the UI.
- Data and storage: browser bookmarks via the Bookmark API; workspace notes,
  folders, and `tasks.json`; config and bookmark-linked metadata in extension
  storage.
- Build tooling and configuration (Vite, TypeScript, Bun scripts).
- Testing: Vitest for unit tests, Playwright for browser/extension-page tests.
- Documentation (`.doc/`, `docs/`, `.rule/`, `.plan/`, `AGENTS.md`).

## First Launch: Choosing Your Workspace

On first launch, StartSpace asks you to choose a workspace folder using the File System Access API.

**What happens:**
- You pick a folder on your computer.
- That folder becomes your workspace.
- StartSpace stores your notes (Markdown files), folders, and `tasks.json` there.
  Small app settings and bookmark-linked metadata stay in extension storage.
- The extension itself is managed by the browser; the workspace is yours and does not depend on a server.

**Things to know:**
- You can use an existing Markdown folder as your workspace if you want — your existing notes remain usable.
- You can edit notes with any Markdown editor (VS Code, Obsidian, etc.) — StartSpace reads and writes ordinary `.md` files.
- StartSpace keeps note relationship IDs in `.startspace/note-identities.json` inside the workspace. Keep this file with the Markdown files when moving a workspace; Settings backups include it automatically. App-managed note and folder moves keep task and bookmark relationships connected.
- You can change or reconnect your workspace from Settings.

## Quick Tour

Once installed and your workspace is chosen:

1. **Home** — your homepage with favorites (from bookmarks) and the central search bar.
2. **Links** — a three-region view: folder sidebar (All Links, Favorites,
   Recent, the browser folder tree with descendant counts and folder search),
   a bookmark grid or list with name sort, browser order inside a folder and
   a filter field, and a details panel for the selected bookmark.
   Clicking a card opens the bookmark; the **!** icon shows its details and the copy
   button copies the URL. The details panel edits tags and a personal
   description, lists linked notes (link or unlink existing notes) and tasks
   that reference the bookmark. Recent lists bookmarks opened through
   StartSpace in the last 30 days. Create, edit, move and delete still write
   to the browser's bookmarks. HTTP(S) links use Chrome's browser-managed
   favicon when available, with a local initial fallback; FTP and file links
   use the fallback. Chrome may display a permission warning for website icons.
   **View all in Links** under bookmark search
   results opens All Links filtered by your query. Outside the extension, or with `#links?demo=1`,
   **Preview the layout** shows synthetic bookmarks that are never saved.
3. **Notes** — browse the folder explorer (closed by default except the opened note's path). Use a folder's three-dot menu to create notes/folders or delete an empty folder. Toggle preview/edit from the note header; edits save after 1 second of inactivity. Rename, move and import services remain available where exposed in the UI.
   In Preview, each Markdown code block has a Copy code button; clipboard access must be available in the browser.
   PNG, JPEG, GIF, WebP and AVIF files in the selected folder show thumbnails and can be viewed in the document pane. Markdown can display workspace-relative images from nested asset folders; remote images remain blocked.
   Use the image viewer's three-dot menu to rename, move or delete an image. Rename and move may require updating links in your Markdown notes; deletion asks for confirmation and does not have an in-app undo.
   Note stars and tags persist in the workspace; Favorites and Recent remain available after reopening Notes. A malformed or externally changed note metadata file shows an error instead of overwriting it. Use Refresh after editing workspace metadata in another tool.
   If a note changes outside StartSpace while you edit, your draft remains in the editor. Use **Save as new file** to keep both copies, or discard your draft to reload the disk version. Save as new file asks for an unused filename and never replaces an existing note.
   A folder's three-dot menu also offers **Rename folder**. StartSpace verifies copied files before removing the old folder; if a move fails, check the named source and destination paths before retrying. App-managed note and folder renames keep linked tasks and bookmarks connected.
   The last successfully opened note reopens for the same workspace after permission is granted; demo notes are never remembered as real notes.
   If unsaved changes survived a reload or crash, choose **Recover draft** or **Discard draft** when the workspace reconnects. Recovered text stays local to this device and cannot overwrite a changed disk file without passing the normal save check. A missing note still leaves its recovered text available to copy.
4. **Tasks** — a local Kanban board for tasks; link tasks to notes and bookmarks.
5. **Settings** — choose your workspace, view browser search information, open browser search settings, and export or restore a backup.
   Saving a startup preference or the default Links layout shows **Saved** for 3 seconds after the latest successful save.
6. **GitHub** — link to the source repository.

**Search:** when you open a new tab, the browser may keep focus in its address bar. Press **Escape** to move into the Home search input, then type immediately without clicking. **Ctrl/Cmd+K** focuses search on any page; Escape inside the search input clears the query. It searches in order: Bookmarks → Notes → Tasks → Web. Results appear in a scrollable dropdown below the input. Use Arrow Up/Down to select a result and Enter to open it; press Enter without a selected result to search using the browser’s default search engine.

## Import, Export, Backup, and Migration

- **Import Markdown notes:** bring existing Markdown notes/folders into your workspace.
- **Export backup:** in Settings, choose **Export backup**. The downloaded,
  versioned JSON includes every workspace file, StartSpace settings, theme, and
  bookmark-linked metadata. Browser bookmarks themselves remain in the browser.
- **Restore backup:** connect the destination workspace, then choose **Restore
  backup** and select the exported JSON. Matching files are overwritten; files
  not represented by the backup are preserved.
- **Migration:** move the JSON backup to the new computer, install StartSpace,
  choose an empty or existing destination workspace, and restore. Browser
  bookmark sync/export remains the browser's responsibility; linked metadata
  reconnects only when Bookmark IDs are preserved.

## Philosophy

Your browser. Your workspace. Your data.

StartSpace is private, local-first, Markdown-first, user-owned, transparent, and open source. No backend, cloud database, account, or vendor lock-in.

Web search requires the installed extension and its `search` permission. In a web preview or unsupported browser, use the address bar. Settings displays the provider name where the browser exposes it (Firefox); Chrome displays “Browser default” because its API does not expose the name. Settings links to the browser’s search settings and provides a manual address if navigation is blocked. Firefox search API support does not imply full Firefox support for workspace files or the current Chromium build.


## Preview the Notes redesign

On feature/notes-layout, open Notes and choose a workspace for real Markdown editing, or select **Preview the layout** to inspect synthetic sample content. The optional hash route #notes?demo=1 also opens the labeled preview. Demo edits do not write files. Favorites/tags remain planned; Recent is session-only. See [remaining tasks](pages-tasks/notes-layout-tasks.md).
