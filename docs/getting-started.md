# Getting Started

Use this page to set up StartSpace and start using it, whether you're an end user installing from a store or a developer building from source.

## What StartSpace Is

StartSpace is an open-source, local-first browser extension that replaces your browser's New Tab / Home page. It gives you a single homepage with a central search bar that searches across your bookmarks, Markdown notes, and local tasks, with a configurable web search fallback. There is no backend, account, cloud service, or vendor lock-in.

Your browser bookmarks stay in the browser (the browser is the source of truth). Your notes are real Markdown files in a workspace folder you choose. Your tasks are local and linkable to notes and bookmarks.

## End-User Installation

### Chrome / Chromium

1. Open the Chrome Web Store listing for StartSpace (link TBD).
2. Click **Add to Chrome**.
3. On first launch, StartSpace prompts you to choose a workspace folder using the File System Access API.
4. Pick a folder — that folder becomes your workspace for notes, tasks, config, and metadata.

### Firefox

1. Open the Firefox Add-ons listing for StartSpace (link TBD).
2. Click **Add to Firefox**.
3. On first launch, choose your workspace folder when prompted.

## Developer Installation (Build from Source)

Follow this path if you want to build StartSpace from source, contribute, or load an unpacked extension for testing.

### Prerequisites

- Bun (the project's package manager).
- A Chromium-based browser (Chrome, Chromium, Edge, etc.) for testing initially. Firefox support is planned but may have API differences (see `.doc/glossary.md` and `.doc/architecture.md`).
- Git to clone the repository.
- Node.js is not required separately if Bun manages the runtime; use Bun for installs and scripts.

### Clone and Build

```bash
git clone https://github.com/<owner>/startspace.git
cd startspace
bun install
bun run build
```

The build is a Vite build configured for a WebExtensions / Manifest V3 extension. The output is an extension directory ready to load unpacked.

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
3. Load the built extension directory as an unpacked extension.
4. Set StartSpace as your New Tab / Home page if the browser requires it.

On first launch, StartSpace will prompt you to choose a workspace folder.

### Development Workflow

- Make changes to the source.
- Rebuild (`npm run build`).
- Reload the unpacked extension in the browser's extension management page.
- Test in the New Tab page.

### Repository Structure (initial)

The project is a TypeScript + React + Tailwind CSS browser extension built with Vite and WebExtensions / Manifest V3. Expected top-level areas:

- Extension source (manifest, background/service worker, extension pages such as the New Tab / Home page, shared libraries).
- React UI components and pages (Home, Links, Notes, Tasks, Settings, GitHub).
- Styling via Tailwind CSS with a shared `tailwind.config.ts`.
- Markdown rendering via `marked` where note content is rendered in the UI.
- Data and storage: browser bookmarks via the Bookmark API; workspace notes (Markdown), tasks, folders, and StartSpace metadata/config as JSON files; extension storage as needed.
- Build tooling and configuration (Vite, TypeScript, Bun scripts).
- Testing: Vitest for unit tests, Playwright for browser/extension-page tests.
- Documentation (`.doc/`, `docs/`, `.rule/`, `.plan/`, `AGENTS.md`).

The exact tree is finalized during implementation; this list reflects the intended structure based on the selected stack.

## First Launch: Choosing Your Workspace

On first launch, StartSpace asks you to choose a workspace folder using the File System Access API.

**What happens:**
- You pick a folder on your computer.
- That folder becomes your workspace.
- StartSpace stores your notes (Markdown files), tasks, configuration, and metadata there.
- The extension itself is managed by the browser; the workspace is yours and does not depend on a server.

**Things to know:**
- You can use an existing Markdown folder as your workspace if you want — your existing notes remain usable.
- You can edit notes with any Markdown editor (VS Code, Obsidian, etc.) — StartSpace reads and writes ordinary `.md` files.
- You can change or re-select your workspace as needed (workflow TBD).

## Quick Tour

Once installed and your workspace is chosen:

1. **Home** — your homepage with favorites (from bookmarks) and the central search bar.
2. **Links** — manage your browser bookmarks from StartSpace; mark favorites, add tags, link notes/tasks.
3. **Notes** — create, edit, organize, and import Markdown notes in your workspace.
4. **Tasks** — a local Kanban board for tasks; link tasks to notes and bookmarks.
5. **Settings** — configure your web search engine, workspace, import/export, and other options.
6. **GitHub** — link to the source repository.

**Search:** type in the central search bar. It searches in order: Bookmarks → Notes → Tasks → Web (configurable web search engine as the fallback).

## Import, Export, Backup, and Migration

- **Import Markdown notes:** bring existing Markdown notes/folders into your workspace.
- **Export / import configuration and metadata:** move your StartSpace settings and metadata between installations.
- **Backup and restore:** back up your workspace folder to restore later or migrate to another computer.
- **Migration:** because your workspace is a regular folder and your bookmarks live in the browser, moving to another computer means installing StartSpace there, choosing a workspace, and importing your data.

## Philosophy

Your browser. Your workspace. Your data.

StartSpace is private, local-first, Markdown-first, user-owned, transparent, and open source. No backend, cloud database, account, or vendor lock-in.
