# Links layout implementation tasks

Branch: feature/links-layout. Spec and decision: [ADR 0019](../decisions/0019-links-layout.md). Visual source: [Links reference](../references/Links-Page.png).
This is the implementation backlog, not a claim that all design requirements ship.

## Implemented in this branch

- [x] Full-height three-region layout below the shared search bar: 15% sidebar (220–300 px), flexible center, 390 px inspector drawer at ≥1440 px.
- [x] Responsive: same sidebar + inspector drawer (1024–1439 px), folder drawer (768–1023 px), one-column grid and full-width details below 768 px. Hide folders / Show folders controls.
- [x] Sidebar: Add bookmark, Search folders (keeps matching ancestors), All Links / Favorites / Recent with real counts, browser folder tree with descendant counts and disclosure, folder More menu (New folder here, Edit or move, Delete), New Folder at bottom. Native roots are protected.
- [x] Center: view/folder heading, real count, permanent filter field (name, URL, tag, description), Grid/List toggle, Sort (Name A–Z, Z–A, Browser order in folders; Recent sorted by last opened) and Clear filters on no match.
- [x] Cards: browser-provided favicon for HTTP(S) bookmarks with a local initial/globe fallback, name, URL, tags, info (!) button for details, favorite toggle, More (Open, Edit or move, Delete). Clicking the card opens the bookmark.
- [x] Inspector: title/URL, favorite, More, tags (add/remove, trimmed, case-insensitive dedupe), user description, Open Link, Copy URL, Created (browser), Metadata updated, Added to StartSpace, Last opened, folder path.
- [x] Related Notes: resolve stable IDs/paths, open note, Link existing note, remove relation, Missing note markers.
- [x] Related Tasks: list tasks derived from `tasks.json` `bookmarkIds`, open
  tasks, link/unlink existing tasks from the inspector with conflict checks.
- [x] Recent: `lastOpenedAt` recorded when opened through StartSpace; 30-day window.
- [x] Only http/https/ftp/file URLs are opened or saved.
- [x] Opt-in synthetic preview (`#links?demo=1`, or Preview the layout when bookmarks are unavailable) — see Mock data below.
- [x] Unit tests for view selection, counts, folder search, filters, sorting, tags and URL safety (`src/links/links-view.test.ts`).
- [x] LINKS-04: search results offer **View all in Links**, opening All Links with the text filter applied (`#links?q=`).
- [x] Folder tree arrow keys (Up/Down/Home/End, Right expands, Left collapses or moves to parent); Tab is trapped only in modal drawers below their inline breakpoint and focus is restored on close; after deleting a bookmark focus moves to the adjacent card or Add bookmark. Below 768 px the details sheet has **Back to links**.
- [x] LINKS-03: HTTP(S) bookmark favicons load through Chrome's `/_favicon/` API under the `favicon` permission; local initials/globe remain as fallback. Permission documented in ADR 0002.
- [x] LINKS-07: missing related notes offer Relink (replace the reference) and Remove.
- [x] LINKS-08: if the edited bookmark is deleted outside StartSpace the dialog keeps the input, explains it and disables Save; nothing is recreated.
- [x] LINKS-09: labeled skeletons for the three regions while loading; Retry on Bookmark API failures, both in the unavailable state and in the error banner.
- [x] Grid columns: four from 768 px, six from 2560 px (ultrawide), one below 768 px (owner decision recorded in ADR 0019).

## Remaining work

| ID | Priority | Task / acceptance criteria | Current UI |
| --- | --- | --- | --- |
| ~~LINKS-01~~ | — | Rejected: moving bookmark metadata to a workspace sidecar conflicts with ADR 0002, which keeps it in extension storage (see ADR 0019 conflicts). | Metadata stays in `chrome.storage.local`. |
| ~~LINKS-02~~ | P1 | Done: link/unlink existing tasks from the inspector by updating the task record in `tasks.json` with conflict checks. | Task picker and unlink controls in the inspector. |
| ~~LINKS-03~~ | — | Done (see implemented behavior above; `favicon` permission documented in ADR 0002). | Browser favicon with local initial/globe fallback. |
| LINKS-04 | — | Done (see above). | — |
| ~~LINKS-05~~ | — | Dropped: folder-tree typeahead and bookmark/folder dialog focus restoration are not needed. | Existing arrow navigation and modal drawer focus handling remain. |
| ~~LINKS-06~~ | — | Done: cards in folder views show the relative path for bookmarks in descendant folders; direct children need no extra path. | Nested paths appear under the bookmark URL; hidden outside folder views. |
| LINKS-07 | — | Done (see above). Deleted bookmarks keep removing their metadata (ADR 0005). | — |
| LINKS-08 | — | Done (see above). | — |
| LINKS-09 | — | Done (see above). | — |
| ~~LINKS-10~~ | — | Dropped: center “More” menu, bulk actions, drag ordering, custom folder colors, and cross-profile metadata remapping are not needed. | Not planned. |
| ~~LINKS-11~~ | — | Dropped: Trash and bookmark recovery are not needed. | Deletion remains confirmed and direct. |
| ~~LINKS-12~~ | — | Dropped: additional Playwright coverage and replacing the synthetic preview data are not needed. | Existing unit tests and opt-in preview remain. |

## Mock data (to be replaced)

`src/links/links-demo.ts` holds synthetic bookmarks, tags, descriptions, recent opens, one missing note relation and one task that mirror the reference image. It is used only in the explicit preview; edits change in-memory state and browser CRUD shows “not changed in the preview”. Replace or remove it once Playwright fixtures (LINKS-12) cover the same states. No real bookmarks or workspace data are used.

## Validation and rerun

Run `bun run build` and `bun run test`. For manual checks load `dist/` unpacked in Chromium and open the Links page, or run `bun run dev` and open `#links?demo=1` at 1816, 1280, 1024, 768 and 360 px widths.
