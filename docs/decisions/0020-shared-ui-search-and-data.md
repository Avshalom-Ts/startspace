# ADR 0020: Shared UI shell, global search and data ownership

Status: Accepted (design target; implementation tracked per page)
Date: 2026-10-01
Related: ADR 0001, [ADR 0002](0002-manifest-permissions-storage.md), [ADR 0004](0004-homepage-search-and-engine-selection.md), [ADR 0006](0006-portable-backup-format.md), [ADR 0008](0008-browser-default-search.md), [ADR 0009](0009-notes-layout-transition.md), [ADR 0015](0015-stable-note-identities.md), [ADR 0016](0016-note-preferences.md)

## Context

After the initial ADRs, five page images were generated with AI and approved as the visual vision: [Home](../references/Home-Page.png), [Links](../references/Links-Page.png), [Notes](../references/Notes-Page.png), [Tasks](../references/Tasks-Page.png) and [Settings](../references/Settings-Page.png) (reference canvas about 1816 × 866). Page specifications were written from them. This ADR and ADRs 0019 and 0021–0024 record those specifications as decisions.

## Precedence

- Earlier ADRs remain authoritative. Where a design point conflicts with an existing ADR, the existing ADR wins and the design point is listed below as rejected or deferred. The single exception is the search Enter rule, which this ADR deliberately adds on top of ADR 0004/0008.
- The product definition overrides image details. Images define visual composition; ADRs define behavior, responsive rules and states.
- Dimensions and colors are targets estimated from the images, not exact pixel samples. Sample dates, paths, counts, logos, task titles and commands in the images are illustrative only, never seed data.
- Each page lists MVP scope. Preserve major regions, but omit deferred controls instead of shipping inert buttons. Do not remove working features because a design marks them later.

## Product corrections to the images

| Image detail | Decision |
| --- | --- |
| Different search wording/order | One global order: Bookmarks → Notes → Tasks → Web |
| Home AI/tool Running/Stopped | No service probing or fabricated status; later bookmark-launcher panel only |
| Links/Notes Trash | Deferred until real recoverable deletion exists; confirmed direct deletion |
| Task comment icons and avatars | Related-item counters and local timestamps; no account/team/comment system |
| Settings workspace “sync” | “Location, access, storage”; no sync |
| Absolute folder path and Open Folder | Display only capabilities actually available; no native file-manager launch |
| Storage quota | Never invent capacity or a StartSpace allowance |
| Search settings | Informational browser-default behavior, never a provider picker |
| Creation/modified dates | Authoritative metadata only; label first-seen as Added to StartSpace |
| Inconsistent example counters | Compute from real data |

## Decision

### Shell and tokens

Full-width warm dark shell: brand at left (links Home), centered icon-and-label navigation in the order Home · Links · Notes · Tasks · Settings · GitHub, theme control and an orange + New dropdown at right. GitHub opens the configured real repository in a new tab. Utility pages place the search below the navbar, then dense panels; Home places its single search in the hero. Page sidebars are not duplicate global navigation.

At 1440 px and wider: 56 px header, 16–20 px outer gutters, 16 px panel gaps. Utility search occupies the next 68 px (44 px field, about 900 px wide, max 960 px, centered). Panels begin near y=124 px and stop 12–16 px above the bottom. No 1200 px page-width cap.

| Token | Target |
| --- | --- |
| Background | #100D08 |
| Panel / raised surface | #19150F / #211B12 |
| Border | #3C3225 |
| Primary / muted text | #F3E9DC / #C3AF97 |
| Accent / selected wash | #FFAA16 / #3B280D |
| Positive / danger | #49CB60 / #FF8B7F, always with non-color meaning |
| Focus | 2 px #FFD18A outline, 2 px offset |
| Typography | Sans; body 14 px, metadata 12–13, panel 18, page 26, note title 30; line-height 1.5 |
| Spacing | 4, 8, 12, 16, 24, 32 px |
| Radius | 6 px controls; 8–10 px panels/cards |
| Targets | ≥40 px desktop controls, ≥44 px touch |

Selected rows/cards combine amber wash, orange border/left rule and a semantic selected state. Avoid heavy shadows. Verify WCAG AA contrast. Use `lucide-react` icons and local or browser-provided favicons; never a remote favicon service; fall back to an initial or globe. Screenshots are references, not sprite sources.

Active nav link: orange icon/text, underline and `aria-current`. + New opens New bookmark / New note / New task after unsaved-change guards; bookmark creation works without a workspace. Ctrl/Cmd+K focuses search; no forced autofocus that steals the address bar.

### Responsive shell

≥1440 px: full composition. 1024–1439 px: narrower sidebars, inspectors become drawers (per page). 768–1023 px: explorers become drawers. <768 px: 12 px gutters, brand plus Menu/New header, top expanded menu in the same order; search stays below the header. No persistent global left rail. Panels use dynamic viewport height with independent overflow; short viewports may scroll. No document-level horizontal overflow; sticky elements must not obscure focus.

### Global search

Placeholder on every page: “Search bookmarks, notes, tasks, or the web…”; accessible label “Search StartSpace”. After a 150 ms debounce search locally: bookmarks by name/URL/tags, notes by filename/full text/tags, tasks by title/description/labels. Trim input; empty query closes results. Case-insensitive substring; title matches first within a source, then alphabetical and stable ID. Group order Bookmarks → Notes → Tasks → Web, five per local group with View all opening that page's filter. Results show source icon, title and context; excerpts are text. No query leaves the device while searching locally. Workspace unavailability is a labeled partial result, not “no notes/tasks”.

The final option is Search the web for “{query}”. Web search is user-triggered only. Arrow keys select, Escape closes.

**Enter rule (adds on top of ADR 0004/0008):** with a highlighted option, Enter executes it. With nothing highlighted, Enter opens the first local match; only when local searching has completed with no matches does Enter run the web action. Enter while searching waits for completion. On partial failure the web action must be selected explicitly. This replaces only the “Enter with no selection submits the web query” point of ADR 0004 and ADR 0008; everything else in those ADRs stands.

Web execution follows ADR 0008 (browser default search, no provider URLs or override). Home source chips filter visible local groups without changing order; Web is an explicit action, not a provider picker. Bookmark results open with normal modifier behavior; note results open Notes with the file selected; task results open Tasks and its inspector. Accessible combobox/listbox with announced counts.

### Data ownership

| Data | Authority |
| --- | --- |
| Bookmark name, URL, folder, ID/order | Browser Bookmark API |
| Bookmark favorite, tags, description, added-to-StartSpace, last-opened, note relations | Extension storage keyed by Bookmark ID (ADR 0002) |
| Note name/body/hierarchy | `.md` filenames, contents and directories |
| Note ID, favorite, tags, last-opened | `.startspace/note-identities.json` and `.startspace/note-metadata.json` (ADR 0015/0016) |
| Note/bookmark relation | Canonical edge in bookmark metadata; reverse views derived |
| Task data/relations | `tasks.json`; reverse views derived |
| UI settings | Extension storage (ADR 0002) |
| Directory handles, drafts, last selected note | Device-local browser storage |

Files outside `.startspace` stay usable in external tools. Preserve UTF-8, line endings and unrelated files; never follow paths outside the root or silently convert a folder. Sidecar IDs survive app-managed moves; external moves need manual relinking, never filename guessing. Browser IDs are profile-specific; migration requires explicit remapping.

UTC timestamps for events, displayed in OS locale/timezone. Due dates are date-only `YYYY-MM-DD`. Use real file modified times; never invent creation times; first-seen is “Added to StartSpace”; a metadata update is never called a bookmark modification. Counts derive from real data.

Workspace states: Not connected → Connecting → Ready; Permission required, Missing, Unsupported and Error are recoverable. Picker/permission only from a user gesture; cancel keeps the prior connection. Show the folder name unless a real path is available. Unknown/malformed schema disables affected writes and preserves files. Recheck fingerprints before writing, serialize writes, coordinate tabs with a browser-local lock, detect external edits. Report Saved only after success. Refresh on entry/focus and via Refresh workspace; no claim of continuous watching.

### Shared states and accessibility

No workspace: compact Choose workspace explanation; bookmark features still work. Missing permission: Reconnect; note/task mutations disabled. Cached content says it may be stale. Loading uses labeled skeletons; refresh retains data. Source failures offer Retry without blanking other panels. Deletion names the target and true effect, Cancel has default focus, no implied Undo/Trash. Unsaved navigation offers Save / Discard / Cancel. Dialogs restore and contain focus and handle Escape. Skip link, header/nav/main landmarks, one h1 per page, labeled icon buttons, field-associated errors, polite save live region, keyboard trees/tabs/drawers/menus, menu alternatives to drag, usable at 200% zoom and 360 px, reduced motion respected.

### Scope

MVP: shell, navigation/New, global search, Ctrl/Cmd+K, workspace recovery and safe persistence. Later: additional themes options, command palette, custom shortcuts/widgets, import wizards and other browsers.

## Conflicts with existing ADRs (existing ADR wins)

| Design point | Existing ADR | Outcome |
| --- | --- | --- |
| MVP ships dark only and omits the theme control | ADR 0009 retains light/dark; ADR 0006 backs it up | Rejected. Light/dark toggle stays. |
| Bookmark metadata in `.startspace/bookmarks.json` | ADR 0002 keeps bookmark metadata in extension storage and rejects “everything in the workspace” | Rejected. Extension storage remains. |
| Portable UI settings in `.startspace/config.json` | ADR 0002 keeps config in extension storage | Rejected. Extension storage remains; backups per ADR 0006. |
| `.startspace/notes-index.json` | ADR 0015/0016 sidecars | Replaced by the existing sidecars. |
| `.startspace/tasks.json` | Existing `tasks.json` at the workspace root | Deferred; moving it needs its own migration ADR. |
| Chrome-only search adapter | ADR 0008 supports chrome and browser namespaces | ADR 0008 stands. |
| Enter with no selection opens first local match | ADR 0004/0008 submit web search | **Adopted on top** of 0004/0008 by explicit decision. |

## Acceptance

All pages share the shell; typing never triggers a network search; web search uses the browser default; browser bookmark changes propagate; notes remain ordinary Markdown; failed or conflicting writes preserve content; keyboard-only navigation works; permission loss never silently resets workspace data.

## Consequences

The design specification files are retired; these ADRs and the [reference images](../references/) are the source. Page backlogs remain in `docs/pages-tasks/*-tasks.md`.
