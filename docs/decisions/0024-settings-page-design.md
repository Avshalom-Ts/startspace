# ADR 0024: Settings page design

Status: Accepted (design target)
Date: 2026-10-01
Related: [ADR 0002](0002-manifest-permissions-storage.md), [ADR 0006](0006-portable-backup-format.md), [ADR 0008](0008-browser-default-search.md), [ADR 0009](0009-notes-layout-transition.md), [ADR 0020](0020-shared-ui-search-and-data.md). Visual: [Settings-Page.png](../references/Settings-Page.png).

## Context

The approved Settings image shows category navigation, category cards and a status rail. Shared rules and precedence are in ADR 0020.

## Decision

### Composition

Three regions: about 350 px category sidebar, flexible center (≈910 px) and 490 px right rail, 16 px gutters, below the shared search. Category rows have icon, bold name and a muted description; selected row has amber wash and left rule. Center starts with category icon, h1 (for example “General Settings”) and subtitle. The right rail always shows Workspace, later Data Management, and Browser Integration. 18–20 px card padding, 12 px row gaps, 40 px controls. Center and rail scroll independently; navigation stays visible.

| Category | Description | MVP content |
| --- | --- | --- |
| General | Appearance, startup, behavior | Appearance, supported switches, date/time summary |
| Search | Local search, web search | Search order and Web Search information |
| Workspace | Location, access, storage | Connection controls and permission guidance |
| Notes | Editor, Markdown | Current behavior and Refresh workspace |
| Links | Bookmarks, metadata, display | Browser authority and grid/list default |
| Tasks | Defaults, views, labels | Statuses and default priority |
| Import / Export | Backup, restore, migration | Existing backup/restore (ADR 0006) |
| Advanced | Shortcuts, developer options | Later; hidden |
| About | Version, credits, open source | Installed version, real project/license links |

A category click replaces the center and keeps the rail. Navigation list with `aria-current`; last category remembered locally, default General. Never use the word “sync”.

### General

- **Appearance:** theme choice per ADR 0009 plus the accent swatch. Additional themes/accents only with complete accessible tokens; no decorative disabled choices.
- **Startup & Behavior:** Show greeting on Home (default on; hides text only); Open links in new tab (default off; normal bookmark activation only; modifiers still work); Confirm before deleting items is always on and shown as informational.
- Settings save immediately, announce Saved only after success and revert on failure; no page-wide Save button.
- **Date & Time:** show OS locale, timezone and a local example. Format/timezone overrides are later and never rewrite task dates.

### Search

Show “Bookmarks → Notes → Tasks → Web” and explain local searching. Web Search reads: **Uses your browser's default search engine.** Supporting text: “StartSpace does not change your browser's search provider. Bookmarks, notes, and tasks are searched locally. When you choose a web search, your browser uses its current default search engine.” Chrome action **Open Chrome Search Settings** opens `chrome://settings/searchEngines` in a new tab, with a copyable address if blocked. No provider selector, custom URL or override. Unavailable API is disclosed while local search keeps working. Engine-name display follows ADR 0008.

### Workspace

Show the real folder name and connection state; never synthesize an absolute path. Copy copies only what is shown. Choose/Change Location from a user gesture after dirty-content guards; validate before committing; cancel/failure keeps the previous workspace; switching moves no files. Reconnect re-requests permission. Refresh rescans. Disconnect states that files and bookmarks remain untouched. Replace the pictured Open Folder with **View workspace notes**. Explain: “Your browser manages the extension installation. You choose the folder containing your data.” Storage usage is later; if added, sum accessible files labeled “Measured workspace files” without double counting, never invent quota or percentage bars.

### Data management (later additions)

Reserve the rail slot between Workspace and Browser Integration. Future additions: Markdown import with collision preview (default Skip), metadata export clearly not called a full backup, previewed bookmark ID remapping for cross-profile migration. No cloud upload, account or automatic remote backup. Existing backup/restore follows ADR 0006.

### Other categories and integration

Notes explains ordinary Markdown, autosave (ADR 0011), safe preview and external-edit refresh. Links explains browser authority and StartSpace metadata; grid/list preference is functional. Tasks offers default priority None/High/Medium/Low and local labels; no team settings. Browser Integration rows: Bookmarks API, Search API, File System Access, each Available / Permission required / Unavailable / Error with text and icon from real capability checks and links to recovery. About shows the real version, GitHub and license links and “Your browser. Your workspace. Your data.”; no account, billing or telemetry.

### States

Loading one source does not block Search/About. Missing workspace: Choose workspace; denied: Reconnect. Malformed config is preserved with writes disabled and temporary defaults marked. Failed writes revert with Retry. Picker cancel is neutral. Integration failures name the capability.

### Responsive and accessibility

1024–1439 px: 240 px sidebar; rail cards move below center content. 768–1023 px: categories become a labeled dropdown/drawer. <768 px: full-width stacked cards with labels above controls. Labeled switches with checked state; future theme/accent choices as labeled radio groups; each card has a heading; polite save announcements; focus moves to the center heading only on intentional navigation; dialogs restore focus; status colors always have text.

### Scope

MVP: three regions, essential categories, local switches, appearance, workspace lifecycle, Search section, honest integration status, version/GitHub, existing backup/restore. Later: extra themes/accents, date/time overrides, measured storage, import wizards, advanced settings.

## Conflicts with existing ADRs (existing ADR wins)

| Design point | Existing ADR | Outcome |
| --- | --- | --- |
| Fixed dark appearance only | ADR 0009 keeps light/dark | Rejected. Theme choice stays. |
| Settings persist in workspace `config.json`; changes disabled without a workspace | ADR 0002 keeps config in extension storage | Rejected. Settings work without a workspace. |
| Hide Import / Export and Data Management until implemented | ADR 0006 backup/restore is implemented | Rejected. Backup/restore stays visible. |
| Restore defaults to a new empty target and never overwrites | ADR 0006 restore merges and overwrites included paths after validation | ADR 0006 stands; previewed restore is a later addition. |
| Never show a search-engine name | ADR 0008 shows the name where the browser exposes it (Firefox) | ADR 0008 stands. |
| Notes category explains explicit Save | ADR 0011 autosave | ADR 0011 stands. |

## Acceptance

Toggle a preference, reopen and verify persistence; failed saves roll back. Cancel Change Location keeps the workspace. Disconnect deletes nothing. Reconnect after revocation. No provider selector or override is stored; Chrome Search Settings opens without modifying anything. Folder display is honest; no fake quota, sync or service; integration states are real; keyboard and narrow-screen navigation work.
