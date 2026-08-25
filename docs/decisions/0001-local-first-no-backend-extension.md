# ADR 0001: Local-First, No-Backend Browser Extension

**Status:** Accepted (initial)

**Date:** 2026-08-25

**Context:**

StartSpace is a browser homepage/workspace replacement. The product definition calls for:
- A browser extension that replaces the New Tab / Home page.
- No backend, no cloud service, no account, no vendor lock-in.
- Bookmarks from the browser's Bookmark API (browser is source of truth).
- Notes as real Markdown files in a user-chosen workspace folder.
- Local Kanban tasks linkable to notes and bookmarks.
- Unified local search (Bookmarks → Notes → Tasks → Web).
- User-chosen workspace via the File System Access API on first launch.

**Decision:**

StartSpace will be implemented as a browser extension with no backend, no server, and no cloud dependency. All user data lives either in the browser (bookmarks) or in a workspace folder the user chooses (notes, tasks, config, metadata). The extension is the sole client; the browser and the user's filesystem are the sources of truth.

**Consequences:**

- **Positive:**
  - Privacy by default — no data leaves the user's computer unless the user chooses a web search.
  - No account, no sync server, no vendor lock-in.
  - Markdown notes remain usable with external tools (VS Code, Obsidian, etc.).
  - Simple distribution story: store install for end users; clone + build + load unpacked for developers.
  - Clear ownership: browser owns bookmarks; user owns workspace folder; extension is managed by the browser.

- **Trade-offs / constraints:**
  - Dependent on browser extension APIs (manifest, permissions, Bookmarks API, File System Access API).
  - No real-time sync or cross-device state without user-managed export/import/backup.
  - File System Access API availability and behavior vary by browser — affects workspace access and portability.
  - No server means no server-side search indexing, no hosted workspace, no collaboration in the initial version.
  - Migration and backup are user responsibilities (folder backup, export/import flows).

- **What this decision rules out (for now):**
  - Any backend, cloud database, or account system — by design, not by omission.
  - Real-time collaboration, hosted workspace, or server-side indexing.
  - PWA/standalone and additional browser support are deferred, not ruled out forever.

**Rejection of alternatives considered:**

- **Cloud-synced homepage / hosted workspace:** contradicts the local-first, no-backend, no-account philosophy and introduces vendor lock-in and privacy concerns.
- **Standalone desktop app (no browser extension):** would not replace the New Tab / Home page and would lose direct access to the browser's Bookmark API and the browser's home-page replacement capability.
- **Hybrid (local + optional sync):** deferred — the initial version stays strictly local-first; optional sync is a future consideration only if it can be added without compromising the core ownership model.

**Notes:**

- Distribution: end users via Chrome Web Store / Firefox Add-ons; developers via GitHub source + build + load unpacked.
- Workspace is chosen by the user on first launch via the File System Access API; the extension references it, does not own it.
- StartSpace metadata for bookmarks (favorites, tags, date added, related notes/tasks) is linked by Bookmark ID; the browser remains the source of truth for the bookmark itself.
- Import/export/backup/migration are part of the initial scope to preserve portability despite the no-backend design.
