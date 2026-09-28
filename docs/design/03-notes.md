# Notes page decisions

Reference: Notes-Page.png. Route: /notes. Apply [shared decisions](00-shared-ui.md).

## Purpose and observed layout

A Markdown workspace with four joined panes: folder navigator, note list, document editor/preview, and information/relationships inspector. Do not collapse the desktop target into an unrelated two-pane editor.

At the 1816 px reference width, approximate pane widths are 310 / 490 / flexible 670 / 310 px, in one bordered rounded frame with vertical dividers and 16 px outer margins. Frame starts below the shared search near y=124. Use independent scrolling and pinned pane toolbars. Desktop four-pane layout is intended for at least 1600 px.

Navigator: Notes heading with New note and Hide folders; All Notes, Favorites, Recent, later Trash; folder tree with counts; New Folder at bottom. Note list: selected folder breadcrumb/dropdown and view/sort actions; rows with note icon, title, first nonempty body-text excerpt, modified time and favorite star. Selected row has amber wash/left edge. Document: breadcrumb, title, star/More, modified time and tag pills, divider, readable Markdown. Inspector: Info / Links (count) / Tasks (count), tags/Add tag, dates/size, related content and Add link/Add task.

## Selection, content and data

Folder tree is actual workspace hierarchy excluding .startspace; list contains direct notes in a selected folder. Folder count is descendant .md count; All Notes includes all descendants. Clicking a folder selects its list, clicking a note opens its document. All Notes/Favorites/Recent are smart views, not filesystem directories. Favorites uses note sidecar flags; Recent uses local last-opened descending. Normal list defaults to file-modified descending with filename/ID tie-breakers. Sort menu also offers Name ascending.

Filename without .md is the displayed document title; editing Markdown H1 does not rename the file. Breadcrumb is relative path. File content remains ordinary Markdown with no required front matter or proprietary block representation. Tags/favorites/relations are sidecar metadata keyed by stable local note ID. Info shows actual file size and modified time; first-seen is labeled Added to StartSpace, not invented file creation time.

Counts in Info/Links/Tasks must agree; the generated screenshot's different Links counts are illustrative errors. Canonical note-bookmark edges are held in bookmark metadata, task edges in task records. Info summarizes them; dedicated tabs show complete lists.

## Reading and editing

The pictured body looks like rendered Markdown with visible heading markers; implement a safe Markdown preview, not a claim of a fully featured block editor. MVP defaults to Preview on existing files. Add an explicit Edit/Preview segmented control and Save/status beside the document actions: an intentional functional addition because editing must be discoverable. New notes start in Edit.

Preview uses 16 px text, 1.6 line-height, heading hierarchy, amber links, dark code blocks, optional syntax colors and Copy code. Reading width is capped at about 78 characters inside the pane. Markdown source editor uses 15 px monospace and soft wrapping. No WYSIWYG conversion. Sanitise HTML; no scripts or active embeds. Remote images require explicit user loading, local images resolve only within the workspace. Never execute displayed code. Relative Markdown links open accessible workspace files; external links are clearly identified.

Typing shows Unsaved changes. Save/Ctrl+S writes the actual .md after permission/fingerprint checks and only then says Saved. Keep a local recovery draft until successful persistence. Before changing file/route/workspace or discarding changes, offer Save / Discard / Cancel; Save failure prevents navigation. Switching Preview/Edit retains the buffer and does not imply a save.

## File and relationship actions

New note asks for filename and target folder, default selected folder/root. Append .md once; reject empty/invalid names and collisions. New Folder uses the same parent selection. Never overwrite a same-name file.

Document More: Rename, Move, Refresh workspace, Delete. Rename/move update the sidecar ID/path mapping after filesystem success. If move requires copy/delete, verify destination before removing source; partial failure names both surviving paths for recovery. Delete confirmation identifies an actual file removal. Empty folder deletion is supported; recursive deletion and Trash are later.

Refresh rescans disk. Clean open file changed externally: reload and announce. Dirty file changed externally: preserve both versions and offer Reload from disk or Save as new file; no silent overwrite. External missing/moved file retains dirty buffer and offers Save as new file/relink. Import is later; choosing an existing Markdown directory is supported immediately.

Favorite star affects Notes Favorites only, not Home's bookmark Favorites. Add tag edits sidecar tags. Add link chooses an existing browser bookmark; optional New bookmark opens the standard bookmark flow before linking its new ID. Add task chooses an existing task or creates a new local task prelinked to this note. Relation removal only removes an edge. Clicking related bookmark opens its URL; clicking task opens its inspector with unsaved guards.

## States

No workspace: frame-level Choose workspace explanation. Empty folder/workspace: New note/New Folder with clear location. No selection: “Select a note” in document; blank inspector with selection guidance. Empty file is valid and editable. Global search no-match in list offers Clear filter. Read failure names the file and Retry, keeping tree usable. Unsupported encoding shows an error instead of silently rewriting. Permission loss keeps dirty text and disables saving until reconnect. Invalid sidecar disables metadata mutations without hiding readable Markdown. Missing relations show Missing item and Relink/Remove.

## Responsive and accessibility

At 1280–1599 px use 240 px navigator, 300 px list and flexible document; inspector becomes a right drawer opened by Info. At 1024–1279 px navigator is a drawer, list 280 px and document flexible. At 768–1023 px list becomes a drawer beside full-width document. Below 768 px show one stage at a time: folders/list → document → info; Back restores scroll/selection and preserves dirty content. Do not squeeze four panes into unreadable columns.

Navigator is a keyboard tree; note list uses selectable rows with separate star buttons. Document has one h1, source editor accessible filename label, tabs with selection state, save live region and copy feedback. Code blocks scroll internally. Do not trap Tab in the editor. Menus support focus restoration; delete focuses next note or New note. Truncated paths remain available to assistive technology. At 200% zoom use the same responsive stages.

## MVP versus later

MVP: four-region layout, smart views except Trash, real folders, preview/source editing, CRUD/rename/move, refresh/conflict recovery, favorites/tags, note/bookmark/task relations and keyboard save. Later: real recoverable Trash, import wizard, templates, rich-text/block editing, backlinks, split preview, autosave and advanced attachments. No remote document store.

## Acceptance

Verify files open normally in an external Markdown editor; filename and H1 stay independent; source/preview switching preserves text; external conflicting edits never get overwritten silently; app move keeps relationships; deletion affects real files and warns honestly; counters agree; unsafe Markdown/code never executes; narrow-screen navigation and save failure retain the buffer.

