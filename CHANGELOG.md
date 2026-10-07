# Changelog

All notable changes to StartSpace are documented here. Entries describe
user-visible behavior rather than every commit. This file follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories and
[Semantic Versioning](https://semver.org/).

Add changes under Unreleased as they are implemented. Before releasing, move
them into a version section with the release date (`YYYY-MM-DD`) and leave
Unreleased ready for the next changes. See the
[manual release guide](docs/publishing-to-chrome.md).

## [Unreleased]

### Added

- Bookmark cards show a two-line description preview in grid and list views.
  Read more opens the bookmark inspector without navigating to the website.
- Editable website descriptions for bookmarks: Fetch description replaces the
  current text directly. Automatic fetching after creation and one missing
  description per New Tab are enabled by default, require optional HTTP(S)
  website access, and can be disabled separately in Settings > Links.
  Failed attempts leave an editable failure message and are skipped on later
  automatic passes. Existing descriptions are never overwritten automatically.
- Search scopes for bookmarks, notes, tasks, and web.
- Notes image browsing and management for local PNG, JPEG, GIF, WebP, and AVIF
  files, plus workspace-relative images in Markdown.
- Device-local recovery of unsaved note drafts, with explicit Recover or
  Discard actions. Draft recovery copies are not included in portable backups.
- Persistent note stars, tags, recent notes, and last-opened-note context.
- Save as new file for retaining drafts without replacing an existing note.
- Browser-managed favicons for HTTP(S) bookmarks, with local fallbacks.
- Link and unlink existing tasks from a bookmark's Links inspector.
- Categorized Settings with browser capability information, About details,
  repository/issue links, and save confirmation.
- Source-installation instructions for Chrome/Edge and a manual Chrome Store
  release checklist.

### Changed

- Settings now shows bookmark-description fetching availability in the Browser
  Integration sidebar instead of website-access controls in the Workspace card.
  Grant and revoke controls remain in Settings > Links.
- Workspace-owned task and bookmark data now live in `.startspace/tasks.json`
  and `.startspace/bookmark-metadata.json`. Move an existing root-level
  `tasks.json` into `.startspace` before using Tasks. Existing extension-stored
  bookmark metadata is not imported. Favorites, tags, descriptions, and recent
  links require a connected workspace; browser bookmark browsing remains available.
- Backups now use format version 2, storing bookmark metadata as a workspace file.
  Explicit version-1 restores normalize legacy task and metadata locations;
  ambiguous duplicate representations are rejected. Bookmark IDs remain
  browser-profile-specific.
- Bookmark favorites are managed from the Links page; Home displays favorites
  without an add-favorite button or picker.
- Notes now use an explorer/document layout with contextual controls,
  autosave, text direction controls, and code-block copying.
- Links now have folder navigation, grid/list views, Favorites and Recent
  filters, and a details panel for tags, descriptions, and relationships.
- Task management now includes configurable statuses and expanded task details.
- Note relationships use stable IDs stored in
  `.startspace/note-identities.json`; legacy task and bookmark path links are
  migrated when Notes indexes the workspace. Keep this sidecar with your notes.
  App-managed moves preserve relationships; external moves may require relinking.
  See [ADR 0015](docs/decisions/0015-stable-note-identities.md).
- Workspace connection and backup controls are grouped into Settings cards.

### Removed

- The separate Workspace settings category and workspace-name copy action.
  Workspace selection, reconnection, and disconnection remain available.

### Fixed

- Note saves detect external edits and coordinate participating tabs without
  discarding conflicting drafts. See
  [ADR 0017](docs/decisions/0017-notes-save-conflicts.md).
- Note and folder moves verify destination contents before removing sources.
  Explicit Markdown path references are not rewritten automatically. See
  [ADR 0018](docs/decisions/0018-verified-folder-moves.md).
- Home search focus responds to page focus and Escape without overriding
  focused controls or open dialogs; Ctrl/Cmd+K focuses the search field.

## [0.1.0]

Initial Chrome Web Store release. Version 0.1.0 was approved and published;
the publication date has not been recorded here. Historical entries were
reconstructed from Git history.

The maintainer confirms this package includes source through
[`c965794`](https://github.com/Avshalom-Ts/startspace/commit/c965794195ac54957cfabc714aa764fa080db613),
including browser-default web search. The existing `v0.1.0` tag points to the
earlier `5e5675d` commit and does not include that search change; it has not been
moved. The version link below points to the confirmed manual release source.

### Added

- Manifest V3 browser extension replacing New Tab with a local-first workspace.
- Browser bookmark browsing, search, favorites, and bookmark/folder management.
- Markdown note creation, editing, preview, importing, and file/folder management
  in a user-selected local workspace.
- Local Kanban tasks with persistence and links to notes and bookmarks.
- Central bookmark, note, and task search with keyboard result navigation.
- Web search through the browser's default provider, with the `search`
  permission and browser search settings guidance.
- Workspace selection/reconnection, light/dark themes, and global notifications.
- Portable JSON backup and restore for workspace files, configuration, and
  bookmark-linked metadata; browser bookmarks remain managed by the browser.
- Build verification, unit/browser tests, and optional GitHub Actions delivery.

### Fixed

- Favorites open in the current tab rather than always opening a new tab.

[Unreleased]: https://github.com/Avshalom-Ts/startspace/compare/c965794195ac54957cfabc714aa764fa080db613...HEAD
[0.1.0]: https://github.com/Avshalom-Ts/startspace/tree/c965794195ac54957cfabc714aa764fa080db613
