# Backlog

Add upcoming work here when a lightweight ordered list is useful.

## Done

- [x] Fill `.doc/product-definition.md` from the project definition.
- [x] Fill `.doc/architecture.md` (initial skeleton + data/request flow).
- [x] Fill `.doc/glossary.md` with shared terms.
- [x] Create `docs/getting-started.md` (end-user and developer setup).
- [x] Create `docs/decisions/0001-local-first-no-backend-extension.md`.
- [x] Update `docs/README.md` to reflect the real project.
- [x] Update `AGENTS.md` from generic starter to StartSpace.

## Current

- [x] Decide tech stack: TypeScript, React, Tailwind CSS, Vite, WebExtensions / Manifest V3, Browser Bookmarks API, File System Access API, Markdown notes (`.md`), `marked` for Markdown rendering, JSON for local metadata, Vitest + Playwright for testing, Bun as package manager, GitHub Actions for CI/CD, no backend. (Documented in `.doc/architecture.md`, `.rule/*`, `docs/getting-started.md`.)
- [ ] Define the extension manifest, permissions, and storage model for StartSpace metadata/config (JSON in workspace vs extension storage).
- [ ] Define data formats: notes (Markdown `.md`), tasks (workspace format), folders (real directories), StartSpace metadata linked to Bookmark IDs (JSON), config (JSON).
- [ ] Implement first render: homepage shell with navigation (Home · Links · Notes · Tasks · Settings · GitHub) and central search bar UI.
- [ ] Implement bookmark read via Bookmark API; favorites display on homepage.
- [ ] Implement workspace selection flow via File System Access API on first launch.
- [ ] Implement notes: create/edit/delete/rename/move; folder organization; import; search titles and content.
- [ ] Implement tasks: local Kanban board; link to notes and bookmarks.
- [ ] Implement search orchestration: Bookmarks → Notes → Tasks → Web (configurable web search engine fallback).
- [ ] Implement Settings: web search engine configuration, workspace, import/export.
- [ ] Implement import/export/backup/restore/migration flows.
- [ ] Prepare developer build path: clone → build → load unpacked documentation and scripts.
- [ ] Optional: store listing preparation (Chrome Web Store / Firefox Add-ons) when ready.

## Later (future scope, not initial)

- [ ] Command Palette
- [ ] Keyboard shortcuts
- [ ] Custom dashboard/widgets
- [ ] Advanced tagging/filtering
- [ ] Themes
- [ ] PWA/standalone version
- [ ] Additional browser support
