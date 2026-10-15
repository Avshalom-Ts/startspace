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

- Task cards, buttons, and selectors show a pointer cursor on hover. Disabled
  task controls use the unavailable cursor; text fields retain the text cursor.

- Task details use a labeled trash icon for deletion. Sidebar column eye controls
  use primary text color when visible and appear dimmed when hidden.

- The task details sidebar separates Info, Linked notes, and Linked bookmarks
  into tabs. Info contains title, description, and column; drafts remain intact
  when switching tabs. The Add task modal keeps its single-form layout.

- Task note and bookmark links use searchable multi-select dropdowns in the
  details sidebar. Focus shows all available targets; search
  matches titles, note paths, and bookmark URLs. Selected links stay visible with
  unlink controls, and dropdowns support keyboard selection and RTL text.
  Dropdowns overlay surrounding content without shifting the form layout.

- The Tasks filter fills the available header width between the page title and Add task.

- Add task now opens a simple modal with title, description, and column,
  replacing the inline title input. Links are added afterward in the sidebar.
  Column Add buttons preselect
  their column; the global New menu opens the same form. Task details
  save together, RTL/LTR direction is detected automatically, and failed saves
  retain the draft for retry.

- Task titles and descriptions automatically detect text direction for Hebrew,
  Arabic, and English while creating, editing, and viewing tasks, including Home,
  search results, and linked task titles.

- Tasks settings can include or exclude each board column from the Home Tasks
  section. All columns are included by default; choices are saved per workspace
  and filter tasks before the Home count limit without changing search or the board.

- Each feature’s settings tab groups Home display and search limits in one Home
  page card, with a title, description, and count field for each setting.

- Links, Notes, and Tasks settings each include an independent search-result limit
  (default 6). Search scopes toggle independently and all start selected, showing
  up to 18 local matches plus one Web action by default. All result beneath a
  feature shows only that feature's matches in the dropdown without a limit.
  Existing configurations use the defaults; backups preserve the new settings.

- The Links, Tasks, and Notes settings tabs each control their Home section limit,
  defaulting to 20 each. Favorite notes appear first within the shared notes limit.
  Existing configurations use these defaults without migration.

- The top navigation now has one New menu for bookmarks, notes, and tasks.
- Notes can link and unlink current browser bookmarks from the note information
  pane. An explicit importer moves saved legacy bookmark-to-note relationships
  into the connected workspace without importing other extension metadata.
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
- Notes settings can explicitly enable remote HTTP(S) Markdown images for all
  note previews. Relative note links now support URL-encoded paths and heading
  fragments.
- A note’s Information tab warns in red when it contains remote Markdown images
  that are blocked by the shared Notes setting.
- Persistent top-center decision prompts for actions that need a choice. A
  changed-on-disk note can now keep its draft or explicitly use the disk
  version without interrupting editing.
- Import selected Markdown files into the current Notes folder. Existing files
  are never replaced; non-UTF-8 Markdown is reported and left unchanged.
- Device-local recovery of unsaved note drafts, with explicit Recover or
  Discard actions. Draft recovery copies are not included in portable backups.
- Persistent note stars, tags, recent notes, and last-opened-note context.
- Save as new file for retaining drafts without replacing an existing note.
- Browser-managed favicons for HTTP(S) bookmarks, with local fallbacks.
- Folder views show the relative folder path on cards for bookmarks inside
  descendant folders.
- Link and unlink existing tasks from a bookmark's Links inspector.
- Categorized Settings with browser capability information, About details,
  repository/issue links, and save confirmation.
- Source-installation instructions for Chrome/Edge and a manual Chrome Store
  release checklist.

### Changed

- Shared search now exposes accessible combobox results and announces available
  results and the keyboard-selected result to assistive technology.
- Notes now supports keyboard folder-tree navigation, resizable desktop panes,
  a collapsible information inspector, and in-session scroll restoration per
  note.
- Ordinary success, information, warning, and error notifications now time out;
  messages that require a decision stay visible separately until dismissed or
  acted on.
- Notes now explains how to reconnect when workspace access is revoked or the
  selected folder is unavailable. Large workspace scans yield between batches.
- The Notes information pane now separates its table of contents, tags, links,
  and tasks into dedicated tabs. Compact file details and any blocked-remote-image
  warning remain visible at the bottom.
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

- Notes settings now uses a refresh icon instead of garbled text on Refresh workspace.

- Autosaving a note no longer mistakes its own in-progress write for an
  external disk change and repeatedly shows a conflict choice.
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
