# Product Definition

## Vision

StartSpace is an open-source, local-first browser homepage and workspace that replaces the browser's New Tab / Home page. It gives users a single, private surface for searching across their bookmarks, notes, and tasks, and for navigating a small set of workspace views — all without any backend, account, cloud service, or vendor lock-in.

The product outcome: a browser homepage that feels like the user's own workspace — where their own data (bookmarks, markdown notes, local tasks) is first-class, searchable, and linked — while the browser and filesystem remain the source of truth.

## Users and Problem

**Who it's for:**
- People who live in their browser and want their New Tab page to reflect their own content, not a generic search box or portal.
- Markdown users (Obsidian, VS Code, plain-text workflows) who want a browser surface that indexes and links to their existing notes and folders.
- Privacy-conscious users who do not want their homepage data sent to a cloud service, account, or third party.
- Developers and tinkerers who want a transparent, open-source, locally-installable replacement for the default home page.

**Problem:**
- The default browser New Tab page is generic — it does not know about the user's bookmarks, notes, or tasks.
- Existing "new tab" replacements often rely on cloud accounts, sync, or remote services.
- Notes, bookmarks, and tasks usually live in separate tools with no unified local search or linking.
- People who keep data locally (Markdown files, browser bookmarks) have no single workspace surface that ties them together in the browser.

## Value Proposition

- **Local-first, no backend:** everything runs on the user's computer. No account, no cloud database, no server dependency.
- **Your data, your tooling:** bookmarks come from the browser's Bookmark API (browser is source of truth); notes are real Markdown files the user can edit anywhere (VS Code, Obsidian, etc.); tasks are local and linkable.
- **Unified local search:** one search bar covers Bookmarks → Notes → Tasks → Web, with a configurable web search engine fallback.
- **Open source and transparent:** users can audit, build from source, load unpacked, and migrate their workspace easily.
- **Private by default:** no telemetry, no account, no vendor lock-in. "Your browser. Your workspace. Your data."

## Scope

### In scope (initial version)

- Browser extension replacing the browser's New Tab / Home page.
- Central search bar with search order: Bookmarks → Notes → Tasks → Web.
- Configurable web search engine.
- Favorites displayed on the homepage (linked to browser bookmarks via Bookmark ID).
- Navigation: Home · Links · Notes · Tasks · Settings · GitHub.
- **Browser Bookmarks:**
  - Use the browser's Bookmark API.
  - Browser remains source of truth for: URL, Name, Folder structure, Bookmark ID.
  - StartSpace metadata linked by Bookmark ID: Favorites, Tags, Date added to StartSpace, Related notes/tasks.
  - Bookmarks manageable from the Links page.
- **Notes:**
  - Normal Markdown (`.md`) files stored in the user's workspace.
  - Create, edit, delete, rename, and move notes.
  - Organize notes with folders.
- Folders are real directories created in the user's workspace via the browser's File System Access API from the Notes page UI. Nested folders are supported. Folders and notes are ordinary files and directories on disk, visible to and usable from external tools.
  - Import existing Markdown notes/folders.
  - Optionally use an existing Markdown folder directly as the workspace.
  - Notes remain usable with external tools (VS Code, Obsidian, etc.).
  - Main search searches both note titles and content.
- **Tasks:**
  - Local Kanban board.
  - Tasks stored in the workspace.
  - Tasks can be linked to Notes and Bookmarks (e.g., Task → Learn Proxmox → related Notes → related Bookmarks).
- **Local Workspace:**
  - The extension is managed by the browser.
  - On first launch, StartSpace asks the user to choose a workspace folder using the File System Access API.
  - The workspace contains the user's actual data and does not depend on a server.
- **Installation:**
  - Normal users: Chrome Web Store / Firefox Add-ons → Install.
  - Developers: GitHub → Clone/download → Build → Load Unpacked.
  - The browser manages the extension's installation location; the user chooses the StartSpace workspace location.
- **Import / Export:**
  - Import existing Markdown notes.
  - Export/import StartSpace configuration and metadata.
  - Backup and restore the workspace.
  - Easy migration to another computer.

### Out of scope (initial version)

- Cloud sync, accounts, or backend services — by design.
- Real-time collaboration.
- Remote storage or hosted workspace.
- Non-browser platforms (PWA/standalone is a future consideration, not initial).
- Command Palette, keyboard shortcuts, custom dashboard/widgets, advanced tagging/filtering, themes, additional browser support — deferred to future versions.

## Success Metrics

_To be refined once the project has users or a release._

- **Adoption / install metrics:** developer installs via Load Unpacked; store installs (once available).
- **Workspace creation:** number of users who select a workspace folder on first launch.
- **Feature use:** search usage across Bookmarks / Notes / Tasks / Web; notes created and imported; tasks created and linked.
- **Portability:** successful export/import and backup/restore flows.
- **Developer experience:** build-from-source and load-unpacked path is straightforward; contribution signals (issues, PRs).

## Constraints and Assumptions

- **Browser extension model:** the product is a WebExtensions browser extension replacing the New Tab/Home page, built with Manifest V3. It depends on browser APIs (Bookmark API, File System Access API, extension manifest and permissions). Browser support and API availability shape what is possible.
- **Tech stack:** TypeScript, React, Tailwind CSS, Vite, `marked` for Markdown rendering, JSON for local metadata, Vitest + Playwright for testing, Bun as the package manager, GitHub Actions for CI/CD. No backend.
- **Local-first, no backend:** all user data lives in the browser (bookmarks) and the user's chosen workspace folder (notes, tasks, config, metadata). No server is involved.
- **Source of truth:** browser bookmarks are the source of truth for bookmark data. StartSpace metadata is derived/linked, not a replacement for the browser's bookmark store.
- **Markdown-first notes:** notes are real `.md` files, not a proprietary format. They must remain usable outside StartSpace. Markdown rendering in the UI uses `marked`.
- **Local metadata:** StartSpace metadata and configuration are stored as JSON files (in the workspace, or in extension storage as decided during implementation). JSON makes the data inspectable, portable, and editable outside StartSpace where appropriate.
- **Workspace is user-chosen:** the user picks the workspace folder via the File System Access API on first launch; StartSpace does not create or move the user's existing files without consent.
- **Stateless extension, stateful workspace:** the extension itself is managed by the browser (install/uninstall/update by the browser); the workspace is the durable data location the user controls.
- **Initial simplicity:** the first version intentionally keeps scope narrow. Future features (command palette, shortcuts, widgets, themes, PWA, more browsers) are explicitly deferred.
- **Open source distribution:** intended distribution is Chrome Web Store / Firefox Add-ons for normal users, and GitHub source + build + load-unpacked for developers.
- **Security boundary:** secrets, credentials, private keys, and production data are out of scope; local configuration should be stored in ignored environment files where needed, with required variables documented.
