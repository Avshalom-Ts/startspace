# Getting Started

Use this page to set up StartSpace and start using it, whether you're an end user installing from a store or a developer building from source.

## What StartSpace Is

StartSpace is an open-source, local-first browser extension that replaces your browser's New Tab / Home page. It gives you a single homepage with a central search bar that searches across your bookmarks, Markdown notes, and local tasks, with a browser-default web search fallback. There is no backend, account, cloud service, or vendor lock-in.

Your browser bookmarks stay in the browser (the browser is the source of truth). Your notes are real Markdown files in a workspace folder you choose. Your tasks are local and linkable to notes and bookmarks.

## End-User Installation

Version 0.1.0 was uploaded manually to the Chrome Web Store. Uploading does
not mean the listing is approved or publicly available. Until a verified store
listing is linked here, use the source installation below.

### Chrome / Chromium

Public store installation will be documented once the listing is verified.
For installation without a store, follow the Chrome/Edge steps below.

### Firefox

Firefox is not supported by the MVP because its File System Access API support
does not currently provide the required workspace flow.

## Developer Installation (Build from Source)

Follow this path if you want to build StartSpace from source, contribute, or load an unpacked extension for testing.

### Prerequisites

- [Bun](https://bun.sh/) (the project's package manager), using the version
  pinned in [`package.json`](../package.json) (currently 1.3.14).
- Chrome or Microsoft Edge with **Developer mode** and **Load unpacked**
  available. Managed browser policies may prevent loading local extensions.
- Git to clone the repository.
- Node.js is not required separately if Bun manages the runtime; use Bun for installs and scripts.

### Clone and Build

Run these commands in a terminal (PowerShell on Windows also works):

```text
git clone https://github.com/Avshalom-Ts/startspace.git
cd startspace
bun install --frozen-lockfile
bun run build
```

This builds the checked-out source, including changes that may not yet be
released. The current source is newer than the manually uploaded 0.1.0.

The build type-checks the source, creates a Vite/WebExtensions Manifest V3
bundle, and verifies that the required manifest, New Tab page, service worker,
and icons exist. A successful command prints
`Verified load-unpacked extension in dist/.`

### Optional: Package the Build as a ZIP

After a successful build, run one of these commands from the repository root
to compress the **contents** of `dist`. This keeps `manifest.json` at the
archive root, as required for a Chrome Web Store upload.

**Windows (PowerShell):**

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\startspace-build.zip
```

**Linux (Bash, with `zip` installed):**

```bash
(cd dist && zip -qr ../startspace-build.zip .)
```

Use a new archive filename if one already exists; updating an old ZIP can
retain obsolete files. Keep generated ZIPs out of source control.
For local installation, load the `dist` folder, not the ZIP. If sharing the
ZIP for local installation, extract it first and load the folder containing
`manifest.json`. For publishing, follow the
[manual release checklist](publishing-to-chrome.md#3-create-the-upload-zip)
and use a filename matching the release version.

### Load Unpacked

1. Open your browser's extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the generated `dist` folder inside
   your clone, for example `W:\Documents\GitHub\startspace\dist` on Windows.
   Do not select the repository root, `src`, or a ZIP file.
4. Open a new tab. StartSpace should replace the New Tab page. If the browser
   asks whether to keep the new page, confirm the change.
5. Choose a workspace folder and grant read/write access when prompted.
   See [workspace setup](#first-launch-choosing-your-workspace) below.

Keep the clone and its `dist` folder in place: an unpacked extension loads
from that location. The workspace is a separate folder containing your data.
For development, use a separate browser profile with synthetic bookmarks and
a test workspace; StartSpace can modify actual bookmarks and workspace files.
If a store copy or another New Tab extension is enabled, disable it in the
test profile so only one extension controls the New Tab page.

### Update an Existing Source Installation

Save any open drafts and back up important workspace data before updating.
From your clone, with your own local changes preserved:

```text
git pull --ff-only
bun install --frozen-lockfile
bun run build
```

If Git reports conflicting local changes, resolve them before continuing;
do not discard them just to update. After a successful build, click the
extension's **Reload** button on `chrome://extensions` or `edge://extensions`
and open a fresh New Tab page. Rebuilding alone does not reload the extension.
If workspace access needs permission again, use **Reconnect** in Settings.

### Development Workflow and UI Preview

- Make changes to the TypeScript/React source.
- Run `bun run build`, reload the unpacked extension, and open a fresh New Tab
  page to test browser integration.
- `bun run dev` starts a Vite UI preview at the URL printed in the terminal.
  It is not an installed extension: browser bookmarks and browser-default web
  search are unavailable there. Do not use it as proof of extension behavior.
- Firefox is not supported by the current workspace flow; do not load this
  Chromium build as a Firefox temporary add-on.

### Installation Troubleshooting

- **Load unpacked fails:** confirm `bun run build` succeeded and select `dist`,
  which must contain `manifest.json`, `index.html`, and `background.js`.
- **The old UI is still visible:** rebuild, reload the extension, and open a
  fresh tab. Check that you loaded the intended clone's `dist` folder.
- **New Tab does not show StartSpace:** check that it is enabled and no other
  extension controls New Tab; check browser prompts and managed policies.
- **Workspace is disconnected:** choose or reconnect the folder in Settings
  and approve the browser permission prompt.
- **Bookmarks or web search are unavailable:** test the installed extension
  rather than the Vite preview, and check its permissions/errors on the
  extension management page.

### Formatting, Linting, and Tests

- Format and lint changed code before handoff (TypeScript with strict typing as the primary safety net, plus the project's formatter and linter configured in `.rule/coding-rules.md`).
- Run unit tests with Vitest and browser/extension-page tests with Playwright as configured.
- Do not include real bookmarks, real notes, or real workspace contents in test data (see `.rule/testing-rules.md`).

### Repository Structure

The project is a TypeScript + React + Tailwind CSS browser extension built with Vite and WebExtensions / Manifest V3. Expected top-level areas:

- Extension source (manifest, background/service worker, extension pages such as the New Tab / Home page, shared libraries).
- React UI components and pages (Home, Links, Notes, Tasks, Settings, GitHub).
- Styling via Tailwind CSS with a shared `tailwind.config.ts`.
- Markdown rendering via `marked` where note content is rendered in the UI.
- Data and storage: browser bookmarks via the Bookmark API; workspace notes,
  folders, and `.startspace` JSON for tasks and metadata; device config in
  extension storage.
- Build tooling and configuration (Vite, TypeScript, Bun scripts).
- Testing: Vitest for unit tests, Playwright for browser/extension-page tests.
- Documentation (`.doc/`, `docs/`, `.rule/`, `.plan/`, `AGENTS.md`).

## First Launch: Choosing Your Workspace

Choose or reconnect a workspace in Settings using the File System Access API.

**What happens:**
- You pick a folder on your computer.
- That folder becomes your workspace.
- StartSpace stores your notes and folders there. Its workspace-owned JSON lives
  under `.startspace`: `tasks.json`, `note-identities.json`, `note-metadata.json`,
  and `bookmark-metadata.json`. Small device settings remain in browser storage.
- The extension itself is managed by the browser; the workspace is yours and does not depend on a server.

**Things to know:**
- You can use an existing Markdown folder as your workspace if you want — your existing notes remain usable.
- You can edit notes with any Markdown editor (VS Code, Obsidian, etc.) — StartSpace reads and writes ordinary `.md` files.
- StartSpace keeps note relationship IDs in `.startspace/note-identities.json` inside the workspace. Keep this file with the Markdown files when moving a workspace; Settings backups include it automatically. App-managed note and folder moves keep task and bookmark relationships connected.
- You can change or reconnect your workspace from Settings.
- If upgrading from root-level `tasks.json`, move it into `.startspace` before
  using Tasks. A legacy root-only file shows a move warning, not an empty board.
- Existing extension-stored bookmark metadata is not imported. Favorites, tags,
  descriptions, recent links and bookmark relationships require a connected
  workspace. Browser bookmark browsing and creation do not.

## Quick Tour

Once installed and your workspace is chosen:

1. **Home** — your homepage with favorites (from bookmarks) and the central
   search bar. Home displays favorites but does not add or remove them.
2. **Links** — a three-region view: folder sidebar (All Links, Favorites,
   Recent, the browser folder tree with descendant counts and folder search),
   a bookmark grid or list with name sort, browser order inside a folder and
   a filter field, and a details panel for the selected bookmark.
   Clicking a card opens the bookmark; the **!** icon shows its details and the copy
   button copies the URL. Use the favorite toggle on a bookmark card or in its
   details panel to add or remove it from Home Favorites. The details panel edits tags and a personal
   description, lists linked notes (link or unlink existing notes) and tasks
   that reference the bookmark. Recent lists bookmarks opened through
   StartSpace in the last 30 days. Create, edit, move and delete still write
   to the browser's bookmarks. HTTP(S) links use Chrome's browser-managed
   favicon when available, with a local initial fallback; FTP and file links
   use the fallback. Chrome may display a permission warning for website icons.
   **View all in Links** under bookmark search
   results opens All Links filtered by your query. Outside the extension, or with `#links?demo=1`,
   **Preview the layout** shows synthetic bookmarks that are never saved.
   Descriptions remain manually editable. **Fetch description** in the details
   panel replaces the current description directly, without an extra apply step.
   Bookmark cards show a two-line description preview in both grid and list
   views. **Read more** opens the inspector without opening the website.
   Automatic fetching after saving a new bookmark and one missing-description
   bookmark per New Tab are enabled by default. They skip every existing
   description, including failure text. Failed attempts leave an editable
   `Description fetch failed: ...` message; clear it to make the bookmark eligible
   again, or use Fetch description to retry manually.
   During initial workspace setup, optionally choose **Allow HTTP(S) website
   access**, or grant it later in **Settings > Links**. Fetching contacts the
   website directly, without cookies, and only runs with website permission and
   a connected workspace. Disable either automatic behavior separately in
   Settings > Links, or revoke website access there.
   The Settings sidebar's Browser Integration card shows **Fetch bookmarks
   description** availability; it requires website permission and a connected
   workspace.
   Redirect-only, login-required, JavaScript-only, local/private-address or metadata-free sites may not be
   enriched. Each request is limited to 10 seconds and 1 MiB of HTML.
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
  version-2 JSON includes every workspace file (including bookmark metadata),
  StartSpace device preferences and theme. Browser bookmarks themselves remain
  in the browser. Directory handles and unsaved recovery drafts are not exported.
- **Restore backup:** connect the destination workspace, then choose **Restore
  backup** and select the exported JSON. Matching files are overwritten; files
  not represented by the backup are preserved.
  Version-1 backups remain readable: root-level task paths and legacy bookmark
  metadata are converted to `.startspace` files during explicit restore.
  Conflicting old/new representations are rejected before any files are written.
- **Migration:** move the JSON backup to the new computer, install StartSpace,
  choose an empty or existing destination workspace, and restore. Browser
  bookmark sync/export remains the browser's responsibility; linked metadata
  reconnects only when Bookmark IDs are preserved.

## Philosophy

In **Settings > About**, you can read an overview of StartSpace, learn where
your data lives and how local and web search differ, check the installed
version and license, and open the source repository or issue tracker.

Your browser. Your workspace. Your data.

StartSpace is private, local-first, Markdown-first, user-owned, transparent, and open source. No backend, cloud database, account, or vendor lock-in.

Web search requires the installed extension and its `search` permission. In a web preview or unsupported browser, use the address bar. Settings displays the provider name where the browser exposes it (Firefox); Chrome displays “Browser default” because its API does not expose the name. Settings links to the browser’s search settings and provides a manual address if navigation is blocked. Firefox search API support does not imply full Firefox support for workspace files or the current Chromium build.


## Preview the Notes Layout

Open Notes and choose a workspace for real Markdown editing, or select
**Preview the layout** to inspect synthetic sample content. The optional hash
route `#notes?demo=1` also opens the labeled preview. Demo edits do not write
files. See [remaining tasks](pages-tasks/notes-layout-tasks.md).

## Changelog and Manual Releases

See the [changelog](../CHANGELOG.md) for released and unreleased changes.
Maintainers can follow the [manual Chrome Web Store guide](publishing-to-chrome.md)
to prepare and upload a release without using CI/CD.
