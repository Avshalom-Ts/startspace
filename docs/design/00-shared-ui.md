# Shared UI and local data decisions

Applies to all five pages. Visual source: all five approved PNGs. See [source precedence](README.md).

## Product boundary

StartSpace is a browser-managed New Tab/Home extension. Users select a separate data workspace through File System Access. No backend, remote API service, account, cloud database, analytics upload or synchronization is part of StartSpace. Browser extension APIs are allowed. Independently configured browser bookmark sync belongs to the browser, not StartSpace.

Navigation order is Home · Links · Notes · Tasks · Settings · GitHub. GitHub opens the configured real project repository in a new tab; never invent the URL. Browser installation location is not the workspace.

## Observed shell and implementation dimensions

All images show a full-width warm dark shell, white/orange StartSpace brand at left, centered icon-and-label navigation, theme control and orange + New dropdown at right. Utility pages have centered search below the navbar, then dense panels. Home instead places its single search in the hero below the greeting. Page-local left sidebars are not duplicate global navigation.

At 1440 px and wider, use a 56 px header, 16–20 px outer gutters and 16 px inter-panel gaps. Utility search occupies the next 68 px: 44 px-high field, about 900 px wide, maximum 960 px, centered. Main panels begin near y=124 px at the reference size and stop 12–16 px above the bottom. Do not impose a 1200 px page-width cap. Notes' panes are joined with dividers.

| Token | Implementation target |
| --- | --- |
| Background | #100D08 |
| Panel / raised surface | #19150F / #211B12 |
| Border | #3C3225; strengthen for interactive boundaries as needed |
| Primary / muted text | #F3E9DC / #C3AF97 |
| Accent / selected wash | #FFAA16 / #3B280D |
| Positive / danger | #49CB60 / #FF8B7F; always include non-color meaning |
| Focus | 2 px #FFD18A outline, 2 px offset |
| Typography | System/bundled sans; body 14 px, metadata 12–13 px, panel 18 px, page 26 px, note title 30 px; body line-height 1.5 |
| Spacing | 4, 8, 12, 16, 24, 32 px |
| Radius | 6 px controls; 8–10 px panels/cards |
| Targets | At least 40 px desktop controls, 44 px touch targets |

Selected rows/cards combine amber wash, orange border/left rule and semantic selected state. Avoid heavy shadows and excessive saturated surfaces. Verify WCAG AA contrast in the rendered result. Use `lucide-react` for UI icons and local or browser-provided favicons; never contact a remote favicon service. If a favicon is unavailable, use an initial or generic Lucide globe. The StartSpace brand mark and Home background remain artwork: the screenshots are references, not a source for cropped UI sprites.

Active navbar link has orange icon/text and underline plus aria-current. Brand links Home. + New opens New bookmark / New note / New task; route to the proper creation flow after unsaved-change guards. Bookmark creation works without workspace metadata; notes/tasks require connection. Ctrl/Cmd+K focuses search; hide the shortcut hint on touch. No forced autofocus that steals the browser address bar's focus.

MVP ships dark only and omits the inert moon control. Later restore that pictured control with Dark/Light/System choices. The thin decorative mark beside the moon is not an undocumented feature.

## Responsive shell

1440 px and wider: full reference composition. At 1024–1439 px reduce sidebars and move inspectors into drawers per page rules. At 768–1023 px collapse explorers into drawers. Below 768 px use 12 px gutters, brand plus Menu/New header controls, and a top-region expanded navigation menu in the same order. Search stays below the header. Never replace it with a persistent global left rail.

Panels use available dynamic viewport height, with independent overflow where specified. Short viewports may scroll vertically instead of clipping actions. Avoid document-level horizontal overflow; the board and code blocks may have explicitly labeled scroll regions. Sticky elements cannot obscure keyboard focus.

## Global search contract

Visible placeholder on every page: “Search bookmarks, notes, tasks, or the web…”; accessible label: “Search StartSpace”. The inconsistent image placeholders do not alter source priority. Settings content search is deferred.

After a 150 ms debounce, search bookmarks by name/URL/tags, notes by filename/full text/tags, tasks by title/description/labels locally. Trim execution input. Empty query closes results without executing anything. Match case-insensitive substrings; title/name matches rank first within a source, then alphabetical title and stable ID. Always group in order Bookmarks → Notes → Tasks → Web. Show five results per local group and View all to open its page filter.

Results show source icon, title and context: URL/folder, note relative path/text excerpt, or task status. Render excerpts as text. No query goes off-device during local searching. Workspace unavailability is a labeled partial-results condition, not “no notes/tasks exist”.

The final selectable action is Search the web for “{query}”. Web fallback is user-triggered, never automatic after typing, indexing failure, timeout or an empty response. Arrow keys select, Enter executes, Escape closes. With no highlighted option, Enter opens the first local match; if local searching has completed with no matches it executes the web action. Enter while searching waits for completion. On partial failure require selection of the explicit web action rather than treating the failure as zero results.

On Chrome execute chrome.search.query({ text: query, disposition: "CURRENT_TAB" }) with the required extension permission. Never build Google/Bing/DuckDuckGo/Brave/custom query URLs, use chrome_settings_overrides.search_provider, or store a provider preference. The API does not expose provider name; display none. If the API is unavailable, retain the query and show the capability error. Additional browsers require separately verified adapters; Chrome is MVP.

Home's source chips filter which local groups are visible without changing the underlying search order. All is default; Bookmarks/Notes/Tasks constrain displayed matches. Web is an explicit action after local evaluation, not a provider picker or an automatic query submission. Selecting it reveals the web action and requires Enter/click to execute.

Bookmark activation opens the destination with normal modifier behavior and the explicit local “open in new tab” preference. Note results open Notes and select the file; task results open Tasks and its inspector. Search has an accessible combobox/listbox, announced counts, keyboard active option and bounded scrollable popup.

## Workspace and storage ownership

Proposed versioned workspace format:

    <workspace>/
      <ordinary Markdown files and folders>
      .startspace/
        config.json
        bookmarks.json
        notes-index.json
        tasks.json

The actual JSON schema must follow these ownership rules:

| Data | Authority |
| --- | --- |
| Bookmark name, URL, parent folder, ID/order | Browser Bookmark API |
| Bookmark favorite, tags, description, added-to-StartSpace, last-opened, note relations | Sidecar keyed by browser ID |
| Note name/body/hierarchy | Actual .md filename, contents and directories |
| Note ID, favorite, tags, first-seen, last-opened | notes-index sidecar mapped to relative path; no mandatory front matter |
| Note/bookmark relationship | Canonical edges in bookmark metadata; reverse views derived |
| Task data/relations | tasks.json; note/task and bookmark/task reverse views derived |
| Portable UI settings | config.json |
| Directory handles and recovery drafts | Device-local browser storage, not portable permissions |

Files outside .startspace remain usable in external Markdown tools. Preserve UTF-8, existing line endings and unrelated files. Never follow paths outside the chosen root or silently convert an existing folder. Sidecar IDs survive app-managed rename/move; externally moved files require manual relinking, not guessing by filename. Browser IDs are profile-specific; later migration requires explicit remapping.

Use UTC timestamps for events, display OS locale/timezone in MVP. Due dates are date-only YYYY-MM-DD and must not shift with timezone conversion. Use actual file modified time. Do not invent creation times; show Added to StartSpace for first-seen metadata. Do not call a metadata update a native bookmark modification time. Real counts derive from the same dataset, not the image examples.

Workspace states: Not connected → Connecting → Ready; Permission required, Missing, Unsupported and Error are recoverable branches. Open picker/request permission only from a user gesture. Cancel retains the prior connection. Show folder name unless an actual path is available; do not synthesize absolute paths.

Load existing compatible metadata; create a namespace only after user connection permission. Unknown/malformed schema disables affected writes and preserves original files. Recheck affected content fingerprints before writing, serialize app writes and coordinate tabs using a browser-local lock. External editors still require conflict detection. Do not promise atomic filesystem transactions. Keep input on failure and report Saved only after success. Refresh on entry/focus and through Refresh workspace, without claiming continuous filesystem watching.

## Shared states and accessibility

No workspace: a compact Choose workspace explanation; bookmark reads and browser operations still work. Missing permissions: Reconnect workspace; metadata writes and note/task mutations disabled. Cached content must say it may be stale. Loading uses local skeletons with labels; refresh retains data. Source-specific failure offers Retry without blanking unrelated panels.

Deletion names the target and true effect; Cancel gets default focus. Never imply Undo/Trash unless implemented. Unsaved navigation offers Save / Discard / Cancel, and Save must succeed before leaving. Dialogs restore focus, have accessible labels, contain focus, and handle Escape safely.

Provide skip link, header/nav/main landmarks and one h1 per page. Icon buttons have labels/tooltips, errors are associated with fields, save state uses a polite live region. Trees support arrow navigation and expanded state. Tabs, drawers and menus are keyboard usable. All drag operations have menu alternatives. At 200% zoom and 360 px, text remains readable and primary actions visible. Respect reduced motion.

## Shared acceptance and scope

MVP: approved dark shell, top navigation/New, global search, Ctrl/Cmd+K, workspace recovery and safe persistence. Later: themes, command palette, customizable shortcuts/widgets, import/export/backup and other browsers.

Verify all pages share the shell; no typing triggers network search; Chrome uses browser-default search; browser changes propagate; notes remain ordinary Markdown; failed/conflicting writes preserve content; keyboard-only navigation works; permission loss never silently resets workspace data.

