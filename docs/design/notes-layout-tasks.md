# Notes layout implementation tasks

Branch: feature/notes-layout. Visual source: [Notes reference](references/Notes-Page.png).
This is the implementation backlog, not a claim that all design requirements ship.

## Implemented in this branch

- [x] Full-width top navigation, Home/GitHub links, compact mobile menu.
- [x] Shared global search on Notes and Ctrl/Cmd+K; existing browser-default API.
- [x] Four desktop panes; responsive folder/list/document/information stages.
- [x] Actual filesystem folder filtering/counts, note excerpts, sorting and body filter.
- [x] Readable safe Markdown preview; explicit editor and Save/Ctrl+S.
- [x] Dirty navigation guard, disk-content conflict detection, preserved draft on write error.
- [x] Note create/autosave/rename/move/delete with real file operations and deletion confirmation.
- [x] File information, current bookmark relationship display and existing task link/unlink.
- [x] Session-only Recent, clearly labeled.
- [x] Explicit synthetic design preview with in-memory favorites and example tags/relations.
- [x] ADR 0009 records the layout transition without a storage migration.

## Remaining work

| ID | Priority | Task / acceptance criteria | Current UI |
| --- | --- | --- | --- |
| NOTES-01 | P1 | Define versioned note metadata migration from path IDs to stable IDs; preserve existing task/bookmark edges across note/folder moves and backups; test rollback and collisions. | Existing path IDs; renamed targets can leave old relations. |
| NOTES-02 | P1 | Persist favorites/tags/last-opened in workspace after NOTES-01; validate malformed files and external edits, propagate cross-tab updates. | Favorites/Tags visibly planned; preview mocks only; Recent session-only. |
| NOTES-03 | P1 | Restore dirty drafts after reload/crash, keyed by workspace identity; provide recover/discard and clean up after save. Test revoked access and deleted files. | Draft retained only in open page; browser unload warning. |
| NOTES-04 | P1 | Coordinate read-check-write across tabs with browser locks; reject external conflicts, preserve both copies and provide Save as new file. | Content comparison before save; external editors can still race the write. |
| NOTES-05 | P1 | Complete safe folder rename and post-copy verification for move/rename. Update all related paths. | Folder creation and empty-folder-only delete are available in row menus; rename and move verification remain. |
| NOTES-06 | P2 | Add bookmark relationship picker using current browser IDs; migrate extension-local relation metadata to workspace deliberately. | Existing relations displayed, Add link marked soon. |
| NOTES-07 | P2 | Add explicit remote-image consent and relative note links with URL encoding/anchors. | Safe code blocks support Copy code; remote images remain placeholders; simple relative .md links work. Local images are tracked in NOTES-15. |
| NOTES-08 | P2 | Full keyboard tree arrow navigation, resizable panes, modal inspector drawers and remembered scroll. Last-note restoration is tracked separately in NOTES-12. | Native disclosure/buttons; responsive single-region stages. |
| NOTES-09 | P2 | Add a global New dropdown for bookmark/note/task and complete combobox ARIA across shared search. | Notes-specific New note; existing shared search reused. |
| NOTES-10 | P2 | Restore directory import UI and test real browser permission revocation, recovery, very large workspaces and disk encoding edge cases. | Existing import services unchanged; new Notes UI does not expose import. |
| NOTES-11 | P3 | Real Trash with restore semantics, templates, backlinks, split preview and autosave settings. | Omitted, not fake controls. |

## Newly accepted requirements (2026-09-29)

Implemented for NOTES-12 through NOTES-14. See [ADR 0010](../decisions/0010-notes-context-and-feedback.md) for the authoritative behavior.

- [x] **NOTES-12 · P1 — Restore the last opened note per workspace.** A versioned device-local relative path follows the registered handle ID. Restoration waits for permission and the workspace scan; explicit links/new-note actions take precedence. Successful opens and app-managed moves/renames update it; deletion and confirmed missing files clear it. Demo state remains separate. See [ADR 0012](../decisions/0012-notes-selection-storage.md). Draft recovery remains NOTES-03.
- [x] **NOTES-13 · P1 — Collapse folders by default and reveal the opened note.** Open only the active note's ancestor chain on entry, preserve manual disclosure during the visit, reveal explicitly opened notes, and reset on workspace switch. Last-note restoration is tracked separately in NOTES-12.
- [x] **NOTES-14 · P1 — Standardize Notes feedback on global notifications.** File actions, save results and task links use existing global notifications. No save-status banner is shown inside the document; invalid names/collisions remain inline and write failures retain drafts.
- [ ] **NOTES-15 · P1 — Browse and preview local images.** Include supported image files in the Notes folder browser so image-only folders are usable, and render Markdown images referenced by workspace-relative paths (including nested asset folders). Read only through the granted File System Access handle; reject paths escaping the workspace, unsupported/unsafe formats, and unavailable files without exposing data. Manage object URL lifetimes on note/workspace changes, keep remote images blocked pending NOTES-07 consent, and test nested paths, missing images, permission loss and cleanup. Current UI lists only Markdown notes and replaces all Markdown images with placeholders.

## Updated Notes controls (2026-09-29)

Each folder row (including root) provides New note and New folder in a three-dot menu. Non-root rows also offer confirmed empty-folder-only Delete. The note header has an eye/pen mode toggle; edits save after 1 second of inactivity and show a global success notification. Ctrl/Cmd+S remains available. Save conflicts and failures retain the draft and surface global errors. See [ADR 0011](../decisions/0011-notes-controls-and-autosave.md).

## Demo and real-data boundaries

Use Notes → Preview the layout when disconnected, or #notes?demo=1. The banner always identifies the preview. Synthetic note edits and favorites last only while that preview is mounted. File mutation dialogs do not write. Exit preview returns to the real connection state. No service/network calls are added for demo content; external reference links navigate only when clicked.

Real relationships continue using existing relative paths. Do not describe stable-ID migration, portable tags or crash recovery as complete. Do not remove working APIs/features from other pages because a new design marked them “later”.

## Validation and rerun

Run bun run build and bun run test. With bun run dev running on port 5173, run bun run test:notes-browser. Browser checks use Edge by default (set BROWSER_CHANNEL for another installed Playwright channel) and only synthetic browser-private filesystem data. STARTSPACE_TEST_URL can override the local URL. Checks cover desktop/mobile panes, draft navigation, file writes, task links, external conflicts and new notes. No real bookmarks or user workspace are used.
