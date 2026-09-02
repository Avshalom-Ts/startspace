# Glossary

Add shared product and technical terms here as they are introduced.

| Term | Meaning | Preferred usage |
| --- | --- | --- |
| StartSpace | The open-source, local-first browser extension that replaces the browser's New Tab / Home page and provides a unified workspace for bookmarks, notes, and tasks. | Capitalize as "StartSpace". |
| Local-first | The principle that user data lives on the user's computer and the product runs without a backend, cloud service, or account. StartSpace is local-first by design. | Use "local-first" (hyphenated) as the adjective. |
| Workspace | The folder the user chooses via the File System Access API. It holds the user's notes (Markdown), folders, and tasks. Extension configuration and bookmark-linked metadata remain in extension storage. | "the workspace", "workspace folder". Not to be confused with the extension installation location (managed by the browser). |
| Bookmark ID | The browser's own identifier for a bookmark. StartSpace uses it as the stable key to link its metadata (favorites, tags, date added, related notes/tasks) to a bookmark. The browser is the source of truth for the bookmark; StartSpace metadata is derived/linked. | "Bookmark ID" (capital B, capital I, no spaces). |
| Favorites | A StartSpace concept for bookmarks the user marks as favorites; displayed on the homepage. Backed by Bookmark IDs, not a separate bookmark store. | Lowercase "favorites" when referring to the items; "Favorites" when referring to the homepage section. |
| Links page | The StartSpace navigation view for managing browser bookmarks from within StartSpace. Part of the main navigation (Home · Links · Notes · Tasks · Settings · GitHub). | Capitalize as "Links" when referring to the page; "links" in generic sense. |
| Notes | Normal Markdown (`.md`) files stored in the workspace. Created, edited, deleted, renamed, and moved by the user; organized with folders; importable; usable externally (VS Code, Obsidian, etc.). The active note is edited or previewed beside the explorer. | Lowercase "notes" for the items; "Notes" when referring to the navigation section. |
| Tasks | Items on the local Kanban board, stored in the workspace and linkable to notes and bookmarks. | Lowercase "tasks" for the items; "Tasks" when referring to the navigation section. |
| Kanban board | The task view in StartSpace: a local, workspace-stored board for managing tasks. | Lowercase "Kanban board". |
| Search order | The order in which the central search bar queries sources: Bookmarks → Notes → Tasks → Web. The web search engine is the configurable final/fallback step. | "search order" (lowercase). |
| Central search bar | The centered homepage input that searches Bookmarks → Notes → Tasks → Web. Results open in a scrollable dropdown; Arrow Up/Down selects a result and Enter opens it or runs the web fallback. | Lowercase "central search bar". |
| Web search engine | The external web search used as the final step of the search order. The user selects one from StartSpace's predefined Google, Bing, DuckDuckGo, and Brave Search catalog; it is not a StartSpace service. | Lowercase "web search engine". |
| Note explorer | The persistent left pane of Notes. It renders the real workspace root, nested folders, and Markdown notes and remains visible beside the active note. | Lowercase "note explorer" generically; "Notes explorer" is acceptable in UI copy. |
| Active search result | The search-dropdown item currently selected with Arrow Up or Arrow Down. Enter opens it. | Lowercase except when beginning a sentence. |
| File System Access API | The browser API used to let the user choose and access the workspace folder, and to read/write notes, tasks, and backups. | Spell out on first use; "File System Access API" thereafter. |
| Bookmark API | The browser API StartSpace uses to read and manage browser bookmarks. The browser is the source of truth for bookmark data. | "Bookmark API" (capital B, capital A). |
| New Tab / Home page | The browser page StartSpace replaces as the user's homepage. | "New Tab page" or "Home page" depending on browser terminology; "homepage" is acceptable generically. |
| Load Unpacked | The developer installation path: clone/download from GitHub, build, and load the extension unpacked into the browser. | "Load Unpacked" (capital L, capital U) as the path name; "load unpacked" as a verb phrase. |
| Import / Export | Import existing Markdown notes into the workspace; export/import StartSpace configuration and metadata; backup and restore the workspace for migration. | "import", "export", "backup", "restore" as verbs; "Import / Export" when referring to the feature area. |
| Metadata | StartSpace-specific data linked to bookmarks by Bookmark ID: favorites, tags, date added to StartSpace, related notes/tasks. Not a replacement for browser bookmark data. | Lowercase "metadata". |
| Notes page / Notes UI | The StartSpace navigation view for creating, editing, organizing, importing, and searching Markdown notes in the workspace. Provides the "New folder" action for creating folders via the File System Access API. | Capitalize as "Notes" when referring to the navigation section; "notes page" or "Notes UI" for the view. |
| Folder | A real directory inside the user's workspace, created from the Notes page UI via the File System Access API (`getDirectoryHandle(name, { create: true })`). Holds Markdown notes and can be nested. Visible to external tools (VS Code, Obsidian, OS file manager). | Lowercase "folder"; "new folder" for the action. |
| Tags | User-assigned labels on bookmarks (via StartSpace metadata, linked by Bookmark ID). | Lowercase "tags". |
| GitHub | The source repository and distribution point for developers (clone/download, build, load unpacked) and the "GitHub" navigation link in the extension. | "GitHub" (capitalized). |
| Settings | The StartSpace navigation view for configuration (e.g., web search engine, workspace, import/export). | Capitalize as "Settings" when referring to the page. |
| Chrome Web Store / Firefox Add-ons | The end-user distribution platforms for installing StartSpace as a normal extension. | "Chrome Web Store" and "Firefox Add-ons" (capitalized). |
| TypeScript | The language StartSpace is written in, used across the extension: manifest, background/service worker, extension pages, and shared libraries. | "TypeScript" (capitalized). |
| React | The UI library used to build the extension's pages and components. | "React" (capitalized). |
| Tailwind CSS | The styling framework used for the extension's UI, configured via `tailwind.config.ts` with shared design tokens. | "Tailwind CSS" (capitalized); "Tailwind" acceptable after first use. |
| Vite | The build tool used to build the extension for WebExtensions / Manifest V3 output. | "Vite" (capitalized). |
| WebExtensions | The browser extension standard StartSpace targets. | "WebExtensions" (capitalized). |
| Manifest V3 | The extension manifest version StartSpace uses. | "Manifest V3" (capitalized). |
| marked | The Markdown rendering library used in the UI to render note content. | Lowercase "marked". |
| JSON | The format used for local StartSpace metadata and configuration files (and, where relevant, extension storage). Makes the data inspectable, portable, and editable outside StartSpace where appropriate. | Lowercase "JSON". |
| Vitest | The unit-test runner used for pure-logic tests (search, note parsing, task linking, folder logic, serialization, Markdown helpers, etc.). | "Vitest" (capitalized). |
| Playwright | The browser test tool used for extension-page and critical-journey tests (workspace selection, note/folder creation, bookmark read, search, import/export/backup). | "Playwright" (capitalized). |
| Bun | The package manager used for installs, scripts, and day-to-day workflows. | "Bun" (capitalized). |
| GitHub Actions | The CI/CD system used for automated checks and workflows. | "GitHub Actions" (capitalized). |
| No backend | A design property of StartSpace: there is no server, cloud service, account, or database. Data lives in the browser or extension storage (bookmarks, config, metadata) and the user's workspace folder (notes and tasks). | "no backend" (lowercase). |
