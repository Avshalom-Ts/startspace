# ADR 0019: Links three-region layout

Status: Accepted
Storage and manual-only description rules are superseded by
[ADR 0025](0025-workspace-owned-startspace-data.md) and
[ADR 0026](0026-link-description-fetching.md).
Date: 2026-09-30 (extended 2026-10-01 with the full Links design)
Related: [ADR 0005](0005-browser-bookmark-crud.md), [ADR 0002](0002-manifest-permissions-storage.md), [ADR 0020](0020-shared-ui-search-and-data.md). Visual: [Links-Page.png](../references/Links-Page.png). Backlog: [links-layout-tasks.md](../pages-tasks/links-layout-tasks.md).

## Context

The approved Links image replaces the folder-chip and five-column card layout of ADR 0005. Bookmark metadata (favorites, tags, related notes) is stored in `chrome.storage.local` under `startspace.bookmarkMetadata`, keyed by browser Bookmark ID (ADR 0002). Shared rules and precedence are in ADR 0020.

## Decision

### Composition

Three regions below the search: folder sidebar, bookmark grid (default) or list, and selected-bookmark inspector. From 1024 px the sidebar is 15% of the width, clamped to 220–300 px, with a flexible center. The inspector is an overlay drawer anchored to the right of the content area (390 px at ≥1440 px, 360 px at 768–1439 px, full width below) and never changes the grid layout (owner decisions 2026-10-01). 16–24 px gaps, 16 px outer margins. Sidebar and inspector are bordered rounded surfaces; the grid sits on the background. Each region scrolls independently without hiding its heading.

- **Sidebar:** Links heading with Add bookmark and Hide folders; Search folders; All Links, Favorites, Recent (Trash later); divider; real browser folder tree; New Folder at the bottom.
- **Center:** h1 “All Links” or the view/folder name, real count, a permanent filter field, Grid/List toggle and Sort (center More is later).
- **Inspector:** icon, title, URL, favorite and More; tags with Add tag; user description; orange Open Link; Copy URL; dates and folder path; Related Notes / Tasks tabs with relation picker.

This adds on top of ADR 0005: the sidebar tree replaces folder-chip navigation. All other ADR 0005 rules stand.

### Components and data

| Component | Rule |
| --- | --- |
| Folder tree | Browser parent IDs, names and order; native roots protected |
| Smart counts | All = bookmark leaves; Favorites = marked leaves; Recent = opened through StartSpace in the past 30 days |
| Folder badges | Descendant bookmark count; a folder view includes descendants |
| Card | 48 px local/browser icon, name, URL, up to two tag rows, separate favorite toggle, and a two-line description preview with Read more opening the inspector |
| Selected card | Amber border/wash; the card's info (!) icon toggles the inspector. The inspector appears only while a bookmark is selected; its X (or Escape) closes it and clears the selection (owner decision 2026-10-01) |
| Name/URL/folder | Resolved from the live browser tree on every refresh |
| Description/tags/favorite | User-written metadata; no fetched site summary |
| Created | Browser `dateAdded` when available, otherwise “Unavailable” |
| Metadata updated | Only when StartSpace metadata changed; never presented as a browser modification time |
| Added to StartSpace | First metadata association date |
| Related | Note edges in bookmark metadata; task edges derived from `tasks.json` `bookmarkIds` |

Metadata entries gain optional `description`, `lastOpenedAt` and `updatedAt` fields in the same storage; existing entries and backups stay valid.

Grid: four equal columns from 768 px and six from 2560 px (ultrawide) (owner decision 2026-10-01, replacing the image's three-column grid), 12 px gaps, ≈116 px minimum card height; one column below 768 px. Titles/URLs truncate with full accessible values. Default sort Name ascending; also Name descending and Browser order (folder views only). Recent sorts by last opened. Folder search matches folder names and keeps matching ancestors. Filter: one text field between the heading and the layout toggle (owner decision 2026-10-01, replacing the Filters panel) matching name, URL, tags and description; Favorites are reached through the Favorites view. Clear filters restores the view. Global search handoff fills the field in All Links.

### Interactions

- Clicking a card opens the bookmark (modifier keys keep browser behavior) and records `lastOpenedAt` (owner decision 2026-10-01, replacing select-then-open). The info (!) icon opens the inspector, whose Open Link does the same. Card More: Open, Edit or move, Delete. The favorite toggle never navigates. Copy URL reports success without navigating.
- Add/Edit dialog: required Name and URL, destination folder (default the selected folder, otherwise required). Only http, https, ftp and file URLs are opened or saved. Keep input on failure. Browser fields are saved through the Bookmark API; metadata uses the same ID. A creation that succeeded before a metadata failure is never repeated.
- New Folder needs a name and writable parent. Move picks a folder and preserves the ID.
- Tags are trimmed plain text, deduplicated case-insensitively. Clicking a tag on a card or in the inspector opens All Links with that tag in the filter field; this text filter can also match names, URLs or descriptions containing the word (owner decision 2026-10-01). Description is edited inline.
- Related Notes lists title/folder with Link existing note and Remove; opening goes to Notes. Related Tasks lists task and status, links existing tasks from the inspector, and allows unlinking without deleting the task. Relationship updates preserve unrelated `tasks.json` data and report external file conflicts.
- External browser edits update the tree, grid and selection. A selected bookmark deleted elsewhere clears to no selection. A bookmark deleted while its edit dialog is open stays an unsaved form with an explanation and is never recreated automatically.
- HTTP(S) bookmark icons use Chrome's documented Favicon API (`/_favicon/`) with the `favicon` permission and lazy image loading. This reads browser-managed favicon data through the extension endpoint; StartSpace does not request images from bookmark sites or a remote favicon service. Local initials (or a globe) remain visible until an icon loads and whenever the API is unavailable or the icon fails. FTP and file bookmarks use the local fallback. Favicon data is not stored in StartSpace metadata or backups.
- An explicit synthetic preview (`#links?demo=1`, or Preview the layout when bookmarks are unavailable) uses in-memory data and never changes browser bookmarks.

### States

Skeletons for tree/grid. With no selection the inspector is hidden. Empty browser: Add bookmark. Empty folder: “No bookmarks in this folder.” Empty Favorites/Recent explain how items appear. No filter match offers Clear filters. Bookmark API failure shows Retry without blanking the shell. Missing relations show the last-known label, Missing note/task and Relink/Remove. Unknown dates are shown consistently as Unavailable or omitted.

### Responsive and accessibility

1024–1439 px: 220–300 px sidebar. Below 1440 px the inspector drawer is modal with a backdrop; at ≥1440 px it is non-modal so the grid stays usable. 768–1023 px: sidebar becomes a drawer. <768 px: one column; details are a full-width sheet with Back to links that preserves filters, scroll and selection. Hide folders collapses the sidebar and the center exposes Show folders. Semantic tree navigation, selected-card state, named More/favorite buttons, complementary inspector landmark, focus trap only for narrow modal drawers, arrow navigation in Related tabs. After deletion focus the adjacent card or Add bookmark. Tags convey text, not color alone.

### Scope

MVP: three regions, grid/list, folder search/tree, All/Favorites/Recent, sorting, simple filters, browser CRUD, favorite/tags/description, inspector, note relations, and task link/unlink from the inspector. Later: Trash with real recovery, bulk actions, custom folder colors, drag ordering, center More menu, cross-profile metadata remapping.

## Conflicts with existing ADRs (existing ADR wins)

| Design point | Existing ADR | Outcome |
| --- | --- | --- |
| Only empty non-root folders can be deleted; recursive delete later | ADR 0005 accepts confirmed recursive `removeTree` | Rejected. Confirmed recursive folder deletion stays. |
| Bookmark metadata in the workspace; workspace-denied disables metadata writes | ADR 0002 keeps metadata in extension storage | Rejected. Metadata works without a workspace. |
| Delete keeps missing-reference markers for related objects | ADR 0005 removes metadata of deleted bookmarks | ADR 0005 stands; task-side `bookmarkIds` still show as missing on the Tasks page. |
| Sidebar tree instead of folder chips | ADR 0005 retained folder chips | Adopted on top of ADR 0005 by this ADR. |

## Acceptance

Create/edit/move/delete here and verify native browser changes, and the reverse. Clicking a card opens it; the info icon shows details without navigating; Open Link and Copy URL work independently. Duplicate URLs keep independent ID metadata. Tags/description never overwrite browser fields. Verify Recent dates, honest date labels, missing relation handling, responsive inspector and full keyboard flow.
