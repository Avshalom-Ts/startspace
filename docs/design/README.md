# StartSpace — UI and page decisions

Updated: 2026-09-28. Status: grounded in the five supplied page images. Unpictured behavior is specified as an implementation decision.

## Documents

Read [Shared UI and data](00-shared-ui.md), then the relevant page:

- [Home](01-home.md)
- [Links](02-links.md)
- [Notes](03-notes.md)
- [Tasks](04-tasks.md)
- [Settings](05-settings.md)

## Sources and precedence

All five approved attachments were visually inspected: Home-Page.png, Links-Page.png, Notes-Page.png, Tasks-Page.png and Settings-Page.png in E:/Pictures/StartSpace/Pages-visions. The displayed reference canvas is approximately 1816 × 866. These specifications replace the earlier drafts written without access to those generated images.

The StartSpace project definition overrides contradictory image details. The images define visual composition; these documents define missing behavior, responsive rules and states. Dimensions/colors are implementation targets estimated from the images, not exact pixel samples. Sample dates, paths, counts, logos, task titles and Markdown commands are illustrative content, not seed data or executable instructions.

The images show the full design vision. MVP scope is explicitly listed per page: preserve major regions, but omit deferred controls instead of creating inert buttons. Do not replace four-pane Notes or four-column Tasks with a generic simplified layout.

## Product corrections to the images

| Image detail | Decision |
| --- | --- |
| Different search wording/order | One global order: Bookmarks → Notes → Tasks → Web |
| Home AI/tool Running/Stopped | No API probing or fabricated status; later bookmark-launcher panel only |
| Links/Notes Trash | Deferred until real recoverable deletion exists; confirmed direct deletion in MVP |
| Task comment-like icons and avatars | Related-item counters and local timestamps; no account/team/comment system |
| Settings workspace “sync” | “Location, access, storage”; no sync |
| Absolute folder path and Open Folder | Only display capabilities actually available; no promise of native file-manager launch |
| Storage quota | Never invent total capacity or a StartSpace allowance |
| Search settings | Informational browser-default behavior, never a provider picker |
| Creation/modified dates | Use available authoritative metadata; label first-seen as Added to StartSpace |
| Inconsistent example counters | Compute from real data using documented rules |

## Delivery boundary

MVP includes shared navigation/search, workspace access, bookmark management, Markdown editing, four-status Kanban, relationships, dashboard summaries and essential Settings. Later features include extra themes/views, imports/exports, backup/restore and customization. No backend, account, cloud service or vendor-specific search URLs may be introduced.

Implementation review should cover the reference size, 1280, 1024, 768 and 360 px widths; keyboard use; 200% zoom; empty data; denied permission; external edits; failed writes; and every page's acceptance checks. The approved PNGs remain unchanged. Synced sources remain read-only.


## Relationship to existing repository decisions

These documents specify the new visual and interaction target, not a claim about the current implementation. Existing architecture decisions remain recorded in ../decisions/. In particular, ADR 0003 describes the older Notes layout, search ownership, title/identity rules and folder deletion behavior; reconcile those differences in a superseding ADR before implementing the redesign. ADR 0008 remains authoritative for browser-default web search. Proposed metadata formats here require compatibility and migration review against existing workspace files; copying these documents does not migrate data or remove already implemented features.

