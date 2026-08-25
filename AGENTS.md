# Project Instructions

StartSpace is an open-source, local-first browser homepage/workspace. It runs entirely on the user's computer with no backend, API, account, or cloud service. It is a browser extension that replaces the browser's New Tab / Home page, with a central search bar (Bookmarks → Notes → Tasks → Web), favorites, and a local Markdown workspace for notes and tasks.

## Security

- Never commit or expose secrets, credentials, private keys, or production data.
- Store local configuration in ignored environment files and document required variables in an example file.
- The workspace folder is user-chosen via the File System Access API; it contains the user's actual data. Do not ship, log, or expose workspace contents.

## Project Documentation

- Keep the product definition, architecture, and glossary current as the project takes shape (`.doc/product-definition.md`, `.doc/architecture.md`, `.doc/glossary.md`).
- Keep `docs/getting-started.md` accurate against the real implementation — not the product vision alone.
- Record architecture decisions in `docs/decisions/` as ADRs.
- Update database guidance when the data model or migration approach changes (notes are Markdown files; tasks are workspace-stored; bookmarks come from the browser's Bookmark API — no traditional database in scope initially).

## Tech Stack

StartSpace is built with:

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

## Engineering Standards

- Follow the relevant guidance in `.rule/`.
- Prefer small, focused changes with validation appropriate to their risk.
- Do not commit, merge, or publish without explicit approval.

## Source of Truth

- `.doc/product-definition.md` — what StartSpace is and why.
- `.doc/architecture.md` — how the system is composed and how data flows.
- `.doc/glossary.md` — shared terms.
- `docs/` — read-only-friendly guides and ADRs built on top of the above.
