# Home page decisions

Reference: Home-Page.png. Route: /. Apply [shared decisions](00-shared-ui.md).

## Purpose and observed composition

Home combines central search, favorite browser bookmarks, recent notes, compact task and note summaries, and shortcut launchers. Preserve the full-width scenic hero and three dashboard columns rather than reducing this page to a search box and favorites.

The image has a 56 px navbar; a mountain sunset hero from roughly y=56 to y=280; greeting, motto, search and five scope chips; then six panels. Left: Favorites above AI / Tools. Center: Recent above Quick Links. Right: Tasks above Notes. Panels are independent vertical stacks, not equal-height rows.

## Layout and components

Use the shared header with Home active. Hero height is approximately 224 px, with a bundled/local background asset, cover positioning and a dark gradient ensuring readable text. If the final mountain asset is unavailable use a warm dark gradient, never a remote image request or a screenshot crop containing UI. Greeting is centered at 28 px, followed by “Your browser. Your workspace. Your data.” in 16 px text. Morning is 05:00–11:59, afternoon 12:00–17:59, evening otherwise, based on local device time. No account name.

The only global search is centered within this hero, approximately 980 × 48 px, followed by All / Bookmarks / Notes / Tasks / Web chips. Chips use shared search semantics; All selected by default. They are not search-engine choices. Beneath the hero use three equal columns with 16 px gutters and 20 px outer margins. Panel headings have icon, title and an accessible “View all …” chevron.

| Panel | Content and limits | Heading action |
| --- | --- | --- |
| Favorites | Up to seven bookmark tiles plus Add, four columns at reference width | Links → Favorites |
| Recent | Five most recently opened notes: title, relative parent path, last-opened relative time | Notes → Recent |
| Tasks | Five tasks: completion control, title, priority pill if set, due date if set | Tasks → All Tasks |
| Notes | Up to seven top-level filesystem folders, disclosure, name and descendant note count | Notes → All Notes |
| Quick Links | Four bookmark shortcuts, two columns; icon, title, URL, open glyph | Links filtered to Quick Links tag |
| AI / Tools | Later launcher cards, three across, with icon/name/Open | Later shortcut configuration |

Favorites tiles are approximately 125 × 96 px at reference width, icons 40 px, labels one/two lines. Recent rows use about 50 px height, selected/hovered wash and thin separators. Task rows are compact around 36–40 px; completed titles strike through with checked icon. Notes rows show colored folder icons as decoration only; do not alter hierarchy. Quick Links cards show the actual bookmark URL and truncate visually with full accessible text.

## Data and interactions

Favorites come from favorite metadata keyed by browser bookmark ID. Sort by name then ID for MVP; Add opens a picker of existing bookmarks and sets a favorite flag. Offer New bookmark as a secondary route into the normal creation flow, never create private duplicate URLs. Clicking a tile opens the current browser-authoritative URL. Removing a favorite through its menu preserves the bookmark.

Recent is based on locally recorded opening events, not filesystem modified times. Opening a row selects the note. Never expose notes from a disconnected prior workspace.

Tasks sort incomplete before complete, dated before undated, earliest due date first, then updated time descending and ID. Fill to five; completed tasks may appear only after incomplete ones. Completion moves a task to Done and records prior non-Done status for restoration; failures roll back. Title opens the Tasks inspector. Due dates use locale display and full accessible year.

Notes counts include descendant .md files. Expanding a folder reveals direct subfolders and notes within the panel; opening a note routes to Notes, choosing a folder opens its note list. Limit panel height to 300 px with internal scrolling when expanded. Counts use actual files, not sample values.

Quick Links are browser bookmarks with the reserved StartSpace tag “quick-link”; match case-insensitively. Sort by name and cap at four; no independent URL store. Empty card offers Choose quick links, opening the tag-filtered Links view.

AI / Tools is later, not an AI API integration. Its eventual cards reference browser bookmarks tagged “tool”; Open navigates to a user-configured URL, including localhost if supplied. Omit Running/Stopped indicators because StartSpace does not probe services. Do not start local processes or imply tool health. Until implemented, omit this panel without adding dummy status cards.

## States

Each panel loads and fails independently. Favorites/Quick Links can display browser data only when their workspace metadata is available. No workspace: show one Choose workspace banner below search and per-panel concise unavailable messages; native bookmark search remains usable. Do not present unavailable data as an empty collection.

Empty favorites: “Add your first favorite” with picker action. Empty Recent: “Notes you open will appear here.” Empty Tasks: “No tasks yet” plus New task. Empty Notes: New note / New folder. Empty Quick Links: Choose quick links. API failure offers Retry in the affected panel. Failed completion keeps the task and its former state with an inline error. Broken IDs are excluded from launchers, never silently replaced by URL match.

## Responsive and accessibility

At 1024–1439 px use two columns in row order Favorites, Recent, Tasks, Notes, Quick Links, then later Tools. Below 1024 px use one column in that order. At 768–1023 px favorites may remain four across; below 768 px use two across and Quick Links one across. Hero grows to fit wrapping chips; no clipped greeting/search. Hide decorative imagery when necessary for contrast, not functional content.

Use semantic panel headings/lists. Tiles are links with separate menu buttons, never nested interactive elements. Completion buttons expose task-specific checked state. Folder disclosure exposes expanded state. After removing an item, focus next item or empty-state action. Source chips have selected state and keyboard support; no auto web submission when changing scope.

## MVP versus later

MVP: greeting/local hero, global search/chips, Favorites, Recent notes, Tasks, Notes tree summary and Quick Links. Later: AI/tools launcher panel, favorite ordering, user backgrounds, dashboard rearrangement and widgets. All shown data is real local data; never seed the illustrated sample tasks or URLs.

## Acceptance

Verify browser rename/delete updates launchers; Add favorite never duplicates a bookmark; recent order changes only on opening notes; task completion persists; folder counts match descendants; web executes only by explicit action; missing workspace produces honest partial availability; all panel links and controls work at 360 px and by keyboard.

