# StartSpace

StartSpace is an open-source, local-first browser homepage and workspace. It replaces your browser's New Tab / Home page with a single surface for searching across your bookmarks, Markdown notes, and local tasks — with no backend, account, cloud service, or vendor lock-in.

Your browser. Your workspace. Your data.

## What it does

- **Browser extension** that replaces the New Tab / Home page. Built as a WebExtensions extension with Manifest V3, using TypeScript, React, Tailwind CSS, and Vite.
- **Central search bar** with search order: Bookmarks → Notes → Tasks → Web.
- **Configurable web search engine** as the fallback.
- **Favorites** displayed on the homepage, backed by browser bookmarks (by Bookmark ID).
- **Navigation:** Home · Links · Notes · Tasks · Settings · GitHub.
- **Markdown rendering** in the UI via `marked` where note content is shown.
- **Local metadata and config** stored as JSON files (in the workspace and/or extension storage as decided).

### Bookmarks

Uses the browser's Bookmark API. The browser remains the source of truth for URL, name, folder structure, and bookmark ID. StartSpace metadata (favorites, tags, date added, related notes/tasks) is linked by Bookmark ID. Bookmarks can be managed from the Links page.

### Notes

Notes are normal Markdown (`.md`) files stored in your workspace. Create, edit, delete, rename, and move notes. Organize with folders (real directories created via the File System Access API from the Notes page UI). Import existing Markdown notes/folders, or use an existing Markdown folder directly as your workspace. Notes remain usable with external tools such as VS Code or Obsidian. The main search covers both note titles and content. Markdown rendering in the UI uses `marked`.

### Tasks

A local Kanban board. Tasks are stored in the workspace and can be linked to notes and bookmarks.

### Local Workspace

The extension itself is managed by the browser. On first launch, StartSpace asks you to choose a workspace folder using the File System Access API. The workspace contains your actual data and does not depend on a server.

### Import / Export

- Import existing Markdown notes.
- Export/import StartSpace configuration and metadata.
- Backup and restore the workspace.
- Easy migration to another computer.

### Installation

**End users:** Chrome Web Store / Firefox Add-ons → Install.

**Developers:** GitHub → Clone/download → Build → Load Unpacked.

The browser manages the extension's installation location; you choose the StartSpace workspace location.

### Future

The initial version is intentionally simple. Possible later features: Command Palette, keyboard shortcuts, custom dashboard/widgets, advanced tagging/filtering, themes, PWA/standalone version, and additional browser support.

### Tech Stack

- **Language:** TypeScript
- **UI:** React
- **Styling:** Tailwind CSS
- **Build:** Vite
- **Extension:** WebExtensions / Manifest V3
- **Browser integration:** Browser Bookmarks API
- **Local files:** File System Access API
- **Notes:** Markdown (`.md`)
- **Markdown rendering:** `marked`
- **Local metadata:** JSON files
- **Testing:** Vitest + Playwright
- **Package manager:** Bun
- **CI/CD:** GitHub Actions
- **Backend:** None

### Philosophy

Private, local-first, Markdown-first, user-owned, transparent, and open source. No backend, cloud database, account, or vendor lock-in.

## Documentation

- `docs/getting-started.md` — setup and local development.
- `docs/decisions/` — architecture decision records.
- `.doc/product-definition.md` — product definition (source of truth).
- `.doc/architecture.md` — architecture (source of truth).
- `.doc/glossary.md` — shared terms.

## Project structure

```text
StartSpace/
├── .doc/
│   └── product, architecture, and terminology templates
│
├── .plan/
│   └── implementation plans and backlog
│
├── .rule/
│   └── adjustable engineering standards
│
├── agents/
│   └── optional role-specific instructions
│
├── docs/
│   └── human-facing guides, references, and ADRs
│
├── src/
│   ├── app/
│   ├── pages/
│   │   ├── Home/
│   │   ├── Links/
│   │   ├── Notes/
│   │   ├── Tasks/
│   │   └── Settings/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── navigation/
│   │   ├── search/
│   │   ├── bookmarks/
│   │   ├── notes/
│   │   └── tasks/
│   │
│   ├── services/
│   │   ├── bookmarks/
│   │   ├── workspace/
│   │   ├── notes/
│   │   ├── tasks/
│   │   ├── search/
│   │   └── settings/
│   │
│   ├── models/
│   ├── hooks/
│   ├── utils/
│   └── styles/
│
├── public/
│   ├── icons/
│   └── manifest.json
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── README.md
└── LICENSE
```

Add application code, tooling, and project-specific documentation as the project takes shape.

## License

To be determined — open source by design. (Add the chosen license file when ready.)
