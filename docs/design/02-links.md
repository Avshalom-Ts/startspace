# Links page decisions

Reference: Links-Page.png. Route: /links. Apply [shared decisions](00-shared-ui.md).

## Purpose and observed layout

Manage browser bookmarks, StartSpace favorites/tags and relationships. The screenshot shows three regions below search: folder/navigation sidebar, three-column bookmark-card grid, and selected-bookmark inspector. The approved default is Grid, not a plain bookmark list.

At the reference width use approximately 310 px sidebar, flexible center (about 1040 px) and 390 px inspector, with 16–24 px gaps and 16 px outer margins. Panels start at y≈124. Sidebar and inspector have dark bordered rounded surfaces; center grid sits on the background. Each region scrolls independently without hiding its heading.

Sidebar: Links heading with Add bookmark and collapse control; Search folders; All Links, Favorites, Recent, later Trash; divider; real browser folder tree; New Folder anchored at bottom. Center: h1 “All Links” or selected folder/view name, actual bookmark count, Grid/List toggle, Sort, Filters and More; then cards. Inspector: icon/title/URL, favorite and More, tags/Add tag, user description, orange Open Link, Copy URL, dates/folder, Related Notes/Tasks tabs and relation picker.

## Component/data decisions

| Component | Rule |
| --- | --- |
| Folder tree | Browser API parent IDs, names and order; protect native roots |
| Smart counts | All = all bookmark leaves, Favorites = marked leaves, Recent = opened through StartSpace in past 30 days |
| Folder badges | Descendant bookmark count; selecting folder includes descendants and shows each card's path in details |
| Card | 48 px local/browser icon, name, URL, up to two tag rows, separate favorite toggle |
| Selected card | Amber border/wash; selection opens inspector, it does not navigate immediately |
| Inspector name/URL/folder | Resolved from browser ID on every refresh |
| Description/tags/favorite | User-written local metadata; no fetched site summary |
| Created | Browser-provided creation timestamp if available |
| Modified | Omit unknown browser modification time; show Metadata updated when that is the actual source |
| Added to StartSpace | First metadata association date, not browser creation date |
| Related | Canonical note edges in bookmark metadata, task edges derived from task records |

Desktop grid uses three equal columns, 12 px gaps and approximately 116 px minimum card height. Titles/URLs truncate with full accessible values. Default sort Name ascending; options Name descending and Browser order (for a single folder). Recent uses last-opened descending. Folder search matches folder names and preserves matching ancestors; global search handoff filters bookmark matches in All Links. Filters include text, favorite and tags combined with AND; selected tags use AND. Clear filters restores view.

## Primary interactions

Single-click/Enter card selects it; explicit Open Link navigates using shared new-tab preference/modifiers. Card More provides Open, Edit, Move, Delete. Card favorite toggle never changes selection or opens the destination. Copy URL reports success without navigating.

Add/Edit dialog has required Name/URL and destination browser folder. Validate URL, disallow executable schemes, retain input on failure. Default to selected writable folder; otherwise require folder choice. Save browser fields through Bookmark API. Metadata uses the same bookmark ID. A bookmark creation that succeeds before metadata fails must not be repeated on retry.

New Folder requires a name and writable parent. Support rename and deletion of empty non-root folders. Folder moves, recursive folder delete and bulk editing are later. Move bookmark picks a browser folder and preserves ID metadata.

Tags are trimmed plain text, case-insensitive deduplicated. Favorite/tag/description writes require the workspace; native bookmark editing does not. More → Edit details edits description; no need to fetch the bookmarked site. Related Notes tab lists title/path and Link existing note. Selecting a relation opens Notes. Related Tasks lists task/status and Link existing task; adding/removing updates the task record. Removing a relation never deletes its target.

Delete confirmation says “This removes the bookmark from your browser.” On success remove it from visible results, retain missing-reference markers for related objects until reconciled. No fake Trash/Undo. External browser edits update the selection, grid and tree. A bookmark deleted during editing remains an unsaved form with an explanation; do not recreate it automatically.

## States

Initial skeletons for tree/grid; inspector says “Select a bookmark”. Empty browser: Add bookmark. Empty folder: “No bookmarks in this folder.” Empty Favorites/Recent have contextual explanations. Filter no-match offers Clear filters. Browser API failure shows Retry and preserves unrelated shell. Workspace denied disables metadata mutations and shows Reconnect, while bookmark CRUD remains available. Stale selection clears to no-selection when deleted. Missing relations show the last-known label, Missing note/task and Relink/Remove. Unknown dates show Unavailable or are omitted consistently.

## Responsive and accessibility

At 1024–1439 px sidebar is 240 px, grid is two columns and inspector opens as a 360 px right drawer over the center. At 768–1023 px folder sidebar becomes a drawer and grid is two columns. Below 768 px grid becomes one column; detail is a full-width screen/sheet with Back to links. Preserve filters/scroll/selection when returning. The sidebar collapse icon has tooltip/name “Hide folders”; the center then exposes Show folders.

Use semantic tree navigation, selected-card state and named More/favorite buttons. Inspector is a complementary landmark; modal drawer traps focus only on narrow screens. Related tabs implement arrow navigation. Native URL links retain browser modifier behavior. After deletion focus adjacent card or Add bookmark. Tags convey text, not color alone.

## MVP versus later

MVP: three-region composition, grid/list toggle (List shows the same data in rows), folder search/tree, All/Favorites/Recent, name sort, simple filters, browser CRUD, favorite/tags/description, inspector and note/task relations. Later: Trash with actual recovery semantics, bulk actions, custom folder colors, drag ordering and cross-profile metadata remapping. Omit deferred toolbar/menu items.

## Acceptance

Create/edit/move/delete a bookmark here and verify native browser changes, then test the reverse. Select a card without opening it; Open Link and Copy URL work independently. Duplicate URLs keep independent ID metadata. Tags/description never overwrite browser fields. Verify recent dates, honest modification labels, missing relation handling, permission-denied native CRUD, responsive inspector and full keyboard flow.

