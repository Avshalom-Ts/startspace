# ADR 0022: Notes page design

Status: Accepted (design target)
Date: 2026-10-01
Related: [ADR 0003](0003-notes-page.md), [ADR 0009](0009-notes-layout-transition.md)–[ADR 0018](0018-verified-folder-moves.md), [ADR 0020](0020-shared-ui-search-and-data.md). Visual: [Notes-Page.png](../references/Notes-Page.png). Backlog: [notes-layout-tasks.md](../pages-tasks/notes-layout-tasks.md).

## Context

ADR 0009 adopted the four-pane Notes composition and ADRs 0010–0018 recorded its storage and behavior. This ADR records the remaining details of the Notes design specification that are not already covered there. Where those ADRs speak, they win.

## Decision

### Composition

Four joined panes in one bordered rounded frame with vertical dividers: folder navigator, note list, document preview/editor and information inspector. At the 1816 px reference: about 310 / 490 / flexible / 310 px, 16 px outer margins, below the shared search. Independent scrolling with pinned pane toolbars. The full four-pane layout is intended for ≥1600 px.

- **Navigator:** Notes heading with Hide folders; All Notes, Favorites, Recent (Trash later); folder tree with counts and per-folder actions (ADR 0011).
- **List:** folder breadcrumb/dropdown and view/sort actions; rows with icon, title, first non-empty body excerpt, modified time and favorite star; selected row has amber wash and left edge.
- **Document:** breadcrumb, title, eye/pen toggle, More, modified time and tag pills, readable Markdown.
- **Inspector:** Info / Links (count) / Tasks (count), tags with Add tag, dates/size, related items with Add link / Add task.

### Content and data

Folder tree is the real hierarchy excluding `.startspace`; a folder shows its direct notes; counts are descendant `.md` files; All Notes includes all. Smart views are not directories. Default sort modified descending (filename/ID tie-break); also Name ascending. The filename without `.md` is the title; editing the H1 never renames. Info shows real size and modified time; first-seen is “Added to StartSpace”. Counts in Info/Links/Tasks agree. Note/bookmark edges live in bookmark metadata, task edges in tasks.

### Reading and editing

Safe Markdown preview (16 px, 1.6 line-height, amber links, dark code blocks, ≈78-character width) with keyboard-accessible Copy code per fenced block. Monospace soft-wrapped source editor. Existing files open in Preview, new notes in Edit. No WYSIWYG. Sanitize HTML; no scripts or active embeds; never execute code. Remote images need explicit consent (NOTES-07); local images resolve only inside the workspace (ADR 0013). Relative Markdown links open workspace files; external links are identified. Text direction: Auto by default, with Auto/LTR/RTL for the current view only; code stays LTR; not persisted.

### File and relationship actions

New note asks filename and folder (default selected/root), appends `.md` once, rejects empty/invalid names and collisions, never overwrites. Document More: Rename, Move, Refresh workspace, Delete. Moves verify before removing the source (ADR 0018). Delete confirmation names the real file. Empty-folder delete only (ADR 0011); recursive delete and Trash later. Refresh rescans; clean externally changed files reload with an announcement; dirty ones offer Reload from disk or Save as new file (ADR 0017). Note favorite star affects Notes Favorites only. Add link chooses an existing bookmark (optionally create one first); Add task links an existing task or creates one prelinked. Removing a relation removes only the edge.

### States

No workspace: frame-level Choose workspace. Empty folder/workspace: New note / New folder with location. No selection: “Select a note”. Empty files are valid. Read failure names the file with Retry. Unsupported encoding errors without rewriting. Permission loss keeps dirty text and disables saving. Invalid sidecar disables metadata mutations but keeps Markdown readable. Missing relations show Missing item with Relink/Remove.

### Responsive and accessibility

1280–1599 px: 240 px navigator, 300 px list, flexible document; inspector is a right drawer. 1024–1279 px: navigator drawer, 280 px list. 768–1023 px: list drawer beside a full-width document. <768 px: one stage at a time (folders/list → document → info); Back restores scroll/selection and keeps dirty content. Keyboard tree navigator, selectable rows with separate star buttons, one h1, labeled editor, tabs with selection state, save live region, copy feedback, no Tab trap in the editor, focus restoration after menus, delete focuses next note or New note.

### Scope

MVP: four regions, smart views except Trash, real folders, preview/source editing, CRUD/rename/move, refresh/conflict recovery, favorites/tags, note/bookmark/task relations, keyboard save. Later: Trash, import wizard, templates, rich-text editing, backlinks, split preview, advanced attachments.

## Conflicts with existing ADRs (existing ADR wins)

| Design point | Existing ADR | Outcome |
| --- | --- | --- |
| Autosave listed as later; Settings describes “explicit Save” | ADR 0011 guarded 1-second autosave with Ctrl/Cmd+S | ADR 0011 stands. |
| Recursive folder delete (ADR 0003) | ADR 0011 empty-only delete | ADR 0011 stands (already superseded 0003). |

## Acceptance

Files open normally in external editors; filename and H1 stay independent; mode switching preserves text; conflicting external edits are never silently overwritten; app moves keep relationships; deletion is honest; counters agree; unsafe Markdown never executes; narrow navigation and save failures retain the buffer.
