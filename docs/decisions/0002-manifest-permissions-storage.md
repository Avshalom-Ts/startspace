# ADR 0002: Extension Manifest, Permissions, and Storage Model

**Status:** Accepted (draft decision, to be refined during implementation)

**Date:** 2026-08-25

**Related:** none (see subsections below for manifest sketch, export/import/backup/migration, and open questions).

## Context

StartSpace is a WebExtensions / Manifest V3 browser extension with no backend. It replaces the browser's New Tab / Home page and uses two browser APIs: the Bookmark API (browser is source of truth for bookmarks) and the File System Access API (user-chosen workspace folder for notes, tasks, folders, and any workspace-scoped JSON).

Before implementation, we need three things decided enough to build from:

1. The manifest shape and the homepage override mechanism.
2. The permissions list — minimized to product requirements.
3. Where each piece of state lives: extension storage vs the workspace folder.

## Decision

### Manifest (Manifest V3)

- Manifest version 3, with a service worker background script and a homepage served from the extension (e.g., `index.html` + the React app built by Vite).
- The New Tab / Home page override uses the appropriate manifest key for the target browser (e.g., `"chrome_url_overrides": { "newtab": "index.html" }` in Chromium). Finalize the exact keys for each target browser during implementation; Chromium is first.
- Version follows Semantic Versioning (see `.rule/versioning-rules.md`).

#### Manifest sketch (illustrative, not final)

```json
{
  "manifest_version": 3,
  "name": "StartSpace",
  "description": "A local-first browser homepage and workspace. No backend, no account.",
  "version": "0.1.0",
  "action": {
    "default_popup": "index.html",
    "default_title": "StartSpace"
  },
  "chrome_url_overrides": {
    "newtab": "index.html"
  },
  "background": {
    "service_worker": "background.ts"
  },
  "permissions": [
    "bookmarks",
    "storage",
    "fileSystemAccess"
  ],
  "host_permissions": [],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

Notes on the sketch:

- `"fileSystemAccess"` is shown as a permission placeholder. In practice, the File System Access API may not be a manifest permission in every browser; it is typically available to extension pages/scripts but gated by the user through `showDirectoryPicker()`. Confirm the exact permission keys for the target browsers during implementation and remove anything not actually required.
- `"host_permissions": []` is the desired state for the initial version: no blanket host access. Revisit only if the web search fallback genuinely needs a host permission, and then only for the smallest necessary pattern.
- The homepage is served from the extension (e.g., `index.html` + React app built by Vite). The exact entry point and routing inside the extension page is an implementation detail.
- Finalize manifest keys and values during implementation for each target browser.

### Permissions (minimized)

Declare only what the product requires:

- **`bookmarks`** — read and manage browser bookmarks via the Bookmark API. Core to the product; bookmarks are the browser's source of truth; StartSpace links its metadata by Bookmark ID.
- **`storage`** — extension storage for config and bookmark-linked StartSpace metadata. Small, serializable, extension-owned state.
- **File System Access API access** — runtime-gained via `showDirectoryPicker()` for workspace selection and file operations. Treat it as a user-granted capability, not a blanket manifest permission; confirm whether a manifest permission is needed in the target browsers and remove anything not actually required.

Do **not** declare, by default in the initial version:

- Broad host permissions. `host_permissions: []` is the desired state unless the web search fallback genuinely needs a host permission, in which case use the smallest necessary pattern.
- Any backend/sync/remote permission (there is none).
- Unnecessary tab/content-script permissions unless a specific product need arises and is documented.

Principle: each permission maps to a product requirement. If it cannot be tied to `.doc/product-definition.md` or `.doc/architecture.md`, it should not be declared.

### Storage model

Keep two layers separate:

1. **Extension-owned config and metadata — extension storage (`chrome.storage.local` / `browser.storage.local` or equivalent).**
   - Config: web search engine selection, settings/UI state, a reference to the currently selected workspace (not the workspace contents).
   - StartSpace metadata linked to bookmarks by Bookmark ID: favorites, tags, date added to StartSpace, related notes/tasks. This is the natural home for bookmark-linked metadata because it is small, queryable by Bookmark ID, survives workspace re-selection, and does not require re-granting folder write access for every metadata operation.
   - A reference to the granted workspace handle/identity for re-validation/re-requesting access where supported.

2. **User-owned workspace data — the workspace folder (File System Access API).**
   - Notes: Markdown (`.md`) files.
   - Tasks: workspace-stored data (format TBD during implementation; keep it local, portable, and consistent with the Markdown/JSON approach).
   - Folders: real directories created via the File System Access API from the Notes page UI.
   - Workspace-scoped JSON files: only when the data is genuinely about the user's workspace contents and should travel with it (backup, export, migration). Do not invent workspace metadata the user does not need.

**Decision (substantive):** store config and bookmark-linked StartSpace metadata in extension storage; store workspace-scoped metadata as JSON files in the workspace only where it is genuinely user-content-related and should travel with the workspace.

**Rationale:** extension storage is the pragmatic home for config and bookmark-linked metadata (small, queryable by Bookmark ID, survives workspace re-selection). Workspace JSON is reserved for data that is truly part of the user's workspace and should be portable with it. Both layers are JSON-serializable, so export/import/backup/migration can cover both: workspace folder contents plus a serialized export of extension-stored config and bookmark-linked metadata.

### What is NOT stored where

- Notes, tasks, and workspace file contents are **not** stored in extension storage. They live in the workspace folder.
- Browser bookmark data is **not** stored in extension storage. Bookmarks are read from the Bookmark API; the browser is the source of truth.
- StartSpace metadata is **not** duplicated in both extension storage and the workspace unless there is a clear, documented reason. Pick the right home for each piece of data and keep it there.
- Secrets, credentials, private keys, and production data are **not** stored in either layer (see `.rule/coding-rules.md` and `.rule/security`). There is no backend.

### Export / import / backup / migration

Both storage layers are JSON-serializable, so export/import/backup/migration can cover both: workspace folder contents plus a serialized export of extension-stored config and bookmark-linked metadata.

- **Backup and restore:** back up the workspace folder (notes, tasks, folders, any workspace JSON) and, separately, export extension-stored config and bookmark-linked metadata as JSON. Restore both to re-create a StartSpace setup on another machine or after loss.
- **Import / export:** import existing Markdown notes into the workspace; export/import StartSpace configuration and metadata as JSON. Keep the export/import format self-describing and versioned where practical.
- **Migration to another computer:** install StartSpace, choose the workspace folder, import the workspace contents and the exported config/metadata JSON. Bookmarks re-sync from the browser's bookmark store on the new machine (the browser is the source of truth); StartSpace re-links its metadata by Bookmark ID once the bookmarks are present.

### Open questions to resolve during implementation

- Exact manifest keys for the New Tab override in each target browser (Chromium first; Firefox support may differ).
- Whether the File System Access API requires a manifest permission in the target browsers, or is purely runtime-gated via `showDirectoryPicker()`.
- Whether the web search fallback needs a host permission, and if so, the smallest necessary host pattern.
- Exact JSON shapes for config and for StartSpace metadata (favorites, tags, date added, related notes/tasks by Bookmark ID). Define these shapes before implementation and keep them documented.
- Task storage format in the workspace (Markdown, JSON, or a combination). Decide and document before implementation.
- Whether any workspace-scoped metadata is needed at all in the initial version, or whether the workspace can remain notes + tasks + folders + import/export with no extra JSON metadata files.

## Consequences

- **Positive:**
  - Minimal permissions surface; each permission traces to a product requirement.
  - No host permissions by default; the only external network call is the user-triggered web search fallback.
  - Clear ownership: browser owns bookmarks; user owns workspace folder; extension owns small config/metadata in extension storage.
  - Portable workspace (notes, tasks, folders, any workspace JSON) plus a portable export of extension-stored config/metadata for backup/restore/migration.
  - Bookmark-linked metadata is queryable by Bookmark ID without re-entering the workspace.

## Rejection of alternatives considered

- **Everything in the workspace folder:** would make bookmark-linked metadata and extension config less convenient to query and would require folder write access for operations that are naturally extension-owned. Extension storage is the better home for config and bookmark-linked metadata.
- **Everything in extension storage:** would push notes, tasks, and folders out of the user's own folder, breaking the "your workspace is your files" model and making export/backup/migration harder and less transparent. The workspace folder is the right home for user content.
- **Duplicating metadata across both layers by default:** creates two sources of truth and confusion about which is canonical. Avoid duplication unless there is a clear, documented reason.

## Recording

Resolve the open questions listed above during implementation, define the exact manifest keys and JSON shapes, and, where substantive, record the final choices as an ADR update or a follow-up ADR in `docs/decisions/`. Update `.plan/000-backlog.md` when the definition is finalized.
