# Coding Rules

Adapted for StartSpace: a browser extension (Chromium-first initially, Firefox later) with no backend, local-first data, Markdown notes, browser bookmarks, and a local Kanban task board.

## Defaults

- Prefer clear, maintainable code over clever shortcuts.
- Keep functions and modules focused on one responsibility.
- Reuse established project patterns before introducing new abstractions.
- Format and lint changed code before handoff when tools are available.
- Add comments only where intent is not obvious from the code.

## Documentation

Every file and function should be documented enough that a reader understands what it does, why it exists, and how to use it without reading the implementation first.

### File-level documentation

- Every source file should open with a short block comment (or language-equivalent doc header) at the very top that states:
  - What the file is for / what responsibility it owns.
  - What part of the system it belongs to (extension shell, bookmarks, notes, tasks, search, settings, import/export, etc.).
  - Any non-obvious context: which browser APIs it uses, which data it touches, any permissions it depends on, and any constraints worth knowing.
- Example (JavaScript/TypeScript):

```js
// notes-editor.ts
//
// Owns the note editor UI and the read/write operations for a single Markdown
// note in the user's workspace.
//
// Uses the File System Access API to read and write note files. The workspace
// handle must already be granted (see workspace selection). Does not handle
// folder creation or note listing — those live in notes-workspace.ts.
//
// Depends on: FileSystemDirectoryHandle for the workspace, note file name.
```

### Function-level documentation

- Every function (and method) should have a doc comment directly above its declaration that states:
  - What the function does / its purpose.
  - What it receives (parameters: name, meaning, and any important constraints).
  - What it returns (return value, type if relevant, and what the caller can expect).
  - Any side effects, errors it may throw, browser API calls it makes, or conditions where it is not valid to call it.
  - Keep it concise; omit purely obvious details, but do not omit anything a caller needs to use the function correctly.
- Example:

```js
/**
 * Reads the full text content of a note file from the workspace.
 *
 * @param workspace - The granted FileSystemDirectoryHandle for the user's
 *   workspace.
 * @param noteName - The name of the note file (e.g. "welcome.md"), relative
 *   to the workspace root.
 * @returns The raw Markdown text of the note.
 * @throws If the file cannot be read, the workspace access is revoked, or the
 *   noteName is invalid.
 */
function readNote(workspace, noteName) {
  // ...
}
```

### When documentation is required

- Document every exported function, public method, and any non-trivial internal function whose purpose or contract is not obvious from the name and signature alone.
- Document file-level purpose for every source file. A file with no top-of-file explanation is incomplete.
- When a function wraps a browser API call (Bookmark API, File System Access API, extension storage, etc.), document which API it uses and any permission or availability assumptions.
- When a function can fail in a way the caller should handle, document the failure mode rather than leaving it implicit.

### How detailed

- Documentation should be enough to use the function correctly and to understand the file's role in the system. It is not a prose rewrite of the implementation.
- If the implementation changes, update the documentation to match. Outdated documentation is worse than no documentation.

### Formatting

- Use TSDoc / JSDoc-style doc comments consistently for TypeScript functions, methods, and types. Document parameters, return values, thrown errors, side effects, and browser API usage as described in the Documentation section above.

## Language and Tooling

- Use TypeScript consistently across the extension: manifest, background/service worker, content scripts (if any), extension pages (New Tab / Home page), and shared libraries.
- Build with Vite, configured for a WebExtensions / Manifest V3 output. Use Bun as the package manager for installs, scripts, and day-to-day workflows.
- Apply a formatter and linter and run them on changed code before merging. The project uses TypeScript with strict typing as the primary safety net; configure a formatter (e.g., Prettier) and a linter (e.g., ESLint) and apply them consistently.
- Use the module system Vite/TypeScript adopts; avoid ad-hoc global state. Keep extension-internal modules and shared libraries clearly separated.

## Extension Boundaries

- Keep the extension's surface small and intentional. Each permission, API use, and script should have a clear purpose tied to a product requirement.
- Owned responsibilities:
  - **Extension shell / host:** navigation, homepage rendering, search orchestration, settings, workspace selection.
  - **Bookmarks:** read via the Bookmark API; StartSpace metadata linked by Bookmark ID (not a replacement for the browser's bookmark store).
  - **Notes:** read/write Markdown files in the workspace via the File System Access API.
  - **Tasks:** store and render the local Kanban board from workspace data.
  - **Import/export/backup/migration:** operate on workspace files and StartSpace config/metadata.
- Do not mix concerns across these boundaries without a clear reason.

## Browser and Web API Usage

- Use the browser's Bookmark API for bookmark data only. The browser is the source of truth; StartSpace metadata is derived/linked by Bookmark ID.
- Use the File System Access API for workspace access (folder picker, reading/writing notes, tasks, config, metadata, folders). Never treat the workspace as something the extension owns — the user owns it and the browser mediates access.
- Treat browser API availability and permissions as first-class concerns: check for API support, handle cases where a permission or API is unavailable, and never assume an API exists in every target browser.
- Avoid any backend, network, or cloud dependency in the core flow. The only external network call in scope initially is the configurable web search engine fallback in the search bar.

## Data and Storage

- Keep StartSpace metadata (favorites, tags, date added, related notes/tasks) separate from browser bookmark data. Link by Bookmark ID; do not reimplement bookmark storage.
- Keep notes as real Markdown files in the workspace; keep tasks as workspace-stored data; keep config and metadata in extension storage or workspace files as decided.
- Do not persist or log workspace contents, bookmark data, or user content beyond what the product requires.

## Security and Privacy

- Never commit or expose secrets, credentials, private keys, or production data.
- Store local configuration in ignored environment files where needed and document required variables in an example file.
- Do not send user data to any server. The web search fallback sends the query to the user-configured engine only when the user triggers it and only as the last step of the search order.
- Treat the workspace folder as user-owned data. Do not ship, log, or expose workspace contents.

## Handoff and Review

- Format and lint changed code before handoff when tools are available.
- Prefer small, focused changes with validation appropriate to their risk.
- Do not commit, merge, or publish without explicit approval.
