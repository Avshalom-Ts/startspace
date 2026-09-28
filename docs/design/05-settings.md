# Settings page decisions

Reference: Settings-Page.png. Route: /settings. Apply [shared decisions](00-shared-ui.md).

## Purpose and observed layout

The approved page has category navigation on the left, selected category cards in the center and workspace/data/browser status cards on the right. Preserve this three-region arrangement; do not replace it with a narrow single-column generic form.

At reference width use about 350 px left sidebar, flexible center near 910 px and 490 px right rail, 16 px gutters. Panels start near y=128. Left heading Settings; category rows have icon, bold name and muted explanatory line. Selected General row uses amber wash and left rule.

The center begins with category icon, h1 “General Settings” and subtitle. General shows Appearance, Startup & Behavior, Date & Time cards. Right rail always shows Workspace, later Data Management, and Browser Integration. Use 18–20 px card padding, 12 px row gaps and compact 40 px controls. Main content and rail may scroll independently; category navigation remains visible.

## Category navigation and MVP

| Category | Visible description | MVP content |
| --- | --- | --- |
| General | Appearance, startup, behavior | Fixed dark appearance, supported switches, date/time summary |
| Search | Local search, web search | Search order and required Web Search information |
| Workspace | Location, access, storage | Connection controls and permission guidance |
| Notes | Editor, Markdown | Informational current behavior and Refresh workspace |
| Links | Bookmarks, metadata, display | Browser authority and grid/list default |
| Tasks | Defaults, views, labels | Four fixed statuses and default-priority setting |
| Import / Export | Backup, restore, migration | Later; hide category until implemented |
| Advanced | Shortcuts, developer options | Later; no fictional developer switches |
| About | Version, credits, open source | Installed version and configured project/license links |

Click category replaces the center, keeps right rail and updates local route state. Use a navigation list with aria-current, not a tablist unless full tab behavior is implemented. Persist last category locally, default General. Sidebar text “sync” from the image must become “access”; StartSpace has no sync.

## General settings and save behavior

Appearance matches the pictured card and selected amber Dark tile. MVP shows one informational selected Dark tile and the orange accent swatch. Later enable Light/System tiles and a labeled accent radio palette only after each theme has complete accessible tokens. Do not render disabled decorative choices as if implemented.

Startup & Behavior switches:
- Show greeting message on Home page: default on; hides greeting text, keeps hero/search.
- Show quick links on Home page: default on; hides only Quick Links panel.
- Open links in new tab: default off; applies to normal bookmark activation, not search API disposition or internal page navigation. Modifier keys still work.
- Confirm before deleting items: MVP always on and stated as informational behavior. A future toggle must separately define which deletions remain protected; never casually disable actual file-deletion confirmation.

Each editable setting persists immediately to config.json, announces Saved only after success, and restores its prior value on failure. No separate all-page Save button. With no writable workspace disable portable-setting changes with a Choose/Reconnect action; existing browser/device fallback values keep the shell usable.

Date & Time MVP displays OS locale, timezone and local example date/time. The image's format/timezone selectors are later overrides; don't hardcode Jerusalem or its sample date. Store event timestamps as UTC; task due dates remain calendar dates. Later override selectors persist only formatting choices, never rewrite task dates.

## Search category — mandatory product behavior

Display order “Bookmarks → Notes → Tasks → Web” and explain that titles/content are searched locally. Do not provide a provider selector, search-engine logo/name, custom URL input or default-provider override.

Web Search section must say **Uses your browser's default search engine.**

Supporting text: “StartSpace does not change your browser's search provider. Bookmarks, notes, and tasks are searched locally. When you choose a web search, your browser uses its current default search engine.”

Chrome action: **Open Chrome Search Settings**, opening chrome://settings/searchEngines in a new tab using the supported extension tab action. If blocked, show a selectable/copyable address with explanation. This action only opens settings; it never changes them. If the Chrome search API is unavailable, disclose the capability limitation and keep local search operational. Ignore obsolete provider preferences in migrations.

## Workspace category and right card

Show actual folder display name and connection state. File System Access may not expose an absolute path: never reproduce the sample C:\Users\… path or synthesize one. Copy copies only the actual displayed name/path and labels itself accordingly.

Choose/Change Location opens directory selection from a user gesture. Guard dirty notes/tasks first. Validate candidate permission and supported metadata before committing the new connection. Cancel/failure keeps previous workspace. Switching does not move files. Reconnect requests permission for the saved handle. Refresh rescans disk and updates local indexes. Disconnect explicitly states that files and browser bookmarks remain untouched; clear the active handle/cache after resolving drafts.

The pictured Open Folder cannot promise to launch a native file manager. MVP replace it with **View workspace notes**, opening Notes root, alongside Change Location. Place Reconnect where needed and Refresh/Disconnect in the Workspace center. Explain “Your browser manages the extension installation. You choose the folder containing your data.”

Storage Usage is later. If implemented, sum accessible file sizes and label “Measured workspace files” with measurement time and incomplete-scan status. Breakdown: .md note bytes, tasks.json, other .startspace metadata and other user files; categories must not double count. Never use browser storage quota as filesystem disk capacity, invent “10 GB”, or show a percentage bar without a trustworthy denominator. No write permissions are changed by measurement.

## Data Management — later behavior fixed now

Reserve its right-rail location between Workspace and Browser Integration. Until implemented omit it and the Import / Export category.

Export Data: versioned local config/metadata export with scope description; not a full workspace backup. Import Data: validate schema and preview changes/conflicts before writing; user confirms a concrete merge/replace plan. No overwrite by default.

Import Markdown: select files/folders and destination, preview collisions, default Skip with explicit Rename/Overwrite choices. Existing folder use already works through workspace selection.

Create Backup: package workspace files and metadata locally with manifest and completeness status. Browser bookmarks are separate; disclose whether any bookmark snapshot is included. A metadata-only export must never be called complete backup. Restore Backup validates paths/schema, rejects outside-root paths, previews content/conflicts and defaults to a new empty target. Keep original data on cancellation/failure.

Migration cannot assume bookmark IDs survive between profiles. Require previewed explicit ID remapping before applying favorite/tag/relationship metadata. Directory permissions cannot be transferred through exported data. No cloud upload, account or automatic remote backup.

## Other categories and integration card

Notes explains ordinary Markdown, explicit Save, safe preview and external-edit refresh; no nonfunctional template controls. Links explains browser source of truth and workspace-only favorite/tag metadata; grid/list preference is functional. Tasks offers default priority None/High/Medium/Low (None initially), fixed statuses and locally stored labels; no team assignment settings.

Browser Integration rows show Bookmarks API, Search API (Web Search) and File System Access. Determine status from actual capability and permission state; use Available / Permission required / Unavailable / Error, with text and icon. Availability is not a claim that every permission is granted. Permission-required rows link to the relevant recovery action. Never show all-green placeholders.

About uses actual installed extension version, real configured GitHub and license links, and “Your browser. Your workspace. Your data.” No account, billing or telemetry toggles. Do not fabricate license/version/repository values.

## States and errors

Loading one settings source does not block informational Search/About. Missing workspace shows Choose workspace; denied access shows Reconnect. Malformed config preserves the file and disables preference writes, with defaults explicitly marked as temporary. A setting write failure reverts the control and displays error/Retry. Folder picker cancellation is neutral, not an error. Candidate validation failure leaves the prior connection intact. Unavailable integration status names the capability rather than suggesting a backend fallback.

## Responsive and accessibility

At 1024–1439 px sidebar is 240 px; move right-rail cards below center content in the main scroll flow. At 768–1023 px category navigation becomes a labeled dropdown/drawer. Below 768 px cards stack full-width with labels above controls, 16 px padding and wrapped long folder names. Keep global search below navbar.

Switches have labels and checked state; themes/accent choices later use labeled radio groups, not unlabeled colored dots. Each card has a heading. Save feedback uses polite live region; errors associate with control. Category changes move focus to center heading only when intentionally navigating, not on background save. Modal change/disconnect dialogs restore focus. Status colors always have text.

## MVP versus later

MVP: three-region shell, functional essential categories, local settings switches, fixed dark appearance, workspace lifecycle, browser-default Search section, honest integration state, version/GitHub. Later: themes/accent overrides, date/time overrides, measured storage, imports/exports/backups, advanced settings. Preserve locations for future cards but never ship fake controls/statuses.

## Acceptance

Toggle a supported preference and reopen to verify persistence; fail a save and verify rollback. Cancel Change Location and retain original workspace. Disconnect without deleting files. Reconnect after revocation. Confirm no provider selector/name is stored; open Chrome Search Settings without modifying it. Verify folder display is honest, no fake quota, no sync/API service, real integration states and keyboard/narrow-screen category navigation.

