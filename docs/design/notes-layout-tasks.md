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
| NOTES-07 | P2 | Copy code, load local images safely, explicit remote-image consent, relative links with URL encoding/anchors. | Code renders safely, images become placeholders; simple relative .md links work. |
| NOTES-08 | P2 | Full keyboard tree arrow navigation, resizable panes, modal inspector drawers and remembered scroll. Last-note restoration is tracked separately in NOTES-12. | Native disclosure/buttons; responsive single-region stages. |
| NOTES-09 | P2 | Add a global New dropdown for bookmark/note/task and complete combobox ARIA across shared search. | Notes-specific New note; existing shared search reused. |
| NOTES-10 | P2 | Restore directory import UI and test real browser permission revocation, recovery, very large workspaces and disk encoding edge cases. | Existing import services unchanged; new Notes UI does not expose import. |
| NOTES-11 | P3 | Real Trash with restore semantics, templates, backlinks, split preview and autosave settings. | Omitted, not fake controls. |

## Newly accepted requirements (2026-09-29)

Implementation pending. See [ADR 0010](../decisions/0010-notes-context-and-feedback.md) for the authoritative behavior.

- [ ] **NOTES-12 · P1 — Restore the last opened note per workspace.** Persist a versioned device-local selection keyed by registered workspace identity, initially using the relative path. Restore after permission is available; explicit note routes/new-note actions win. Update on successful open/rename/move, clear on deletion or confirmed missing file, retain on temporary errors, and isolate demo state. Prevent slow restoration from replacing a newer selection. Acceptance: navigate away/back, reload and restart; reconnect; test two same-named workspaces, explicit links, missing files, rename/move/delete and demo isolation. Does not depend on NOTES-01 and does not implement draft recovery.
- [x] **NOTES-13 · P1 — Collapse folders by default and reveal the opened note.** Open only the active note's ancestor chain on entry, preserve manual disclosure during the visit, reveal explicitly opened notes, and reset on workspace switch. Last-note restoration is tracked separately in NOTES-12.
- [x] **NOTES-14 · P1 — Standardize Notes feedback on global notifications.** File actions, autosave and task links use existing global notifications; invalid names/collisions remain inline and write failures retain recovery UI and drafts.

## Updated Notes controls (2026-09-29)

Each folder row (including root) provides New note and New folder in a three-dot menu. Non-root rows also offer confirmed empty-folder-only Delete. The note header has an eye/pen mode toggle; edits are saved after 300 ms of inactivity, with global save feedback. Ctrl/Cmd+S remains available. Save conflicts and failures keep the draft and recovery message. See [ADR 0011](../decisions/0011-notes-controls-and-autosave.md).

## Demo and real-data boundaries

Use Notes → Preview the layout when disconnected, or #notes?demo=1. The banner always identifies the preview. Synthetic note edits and favorites last only while that preview is mounted. File mutation dialogs do not write. Exit preview returns to the real connection state. No service/network calls are added for demo content; external reference links navigate only when clicked.

Real relationships continue using existing relative paths. Do not describe stable-ID migration, portable tags or crash recovery as complete. Do not remove working APIs/features from other pages because a new design marked them “later”.

## Validation and rerun

Run bun run build and bun run test. With bun run dev running on port 5173, run bun run test:notes-browser. Browser checks use Edge by default (set BROWSER_CHANNEL for another installed Playwright channel) and only synthetic browser-private filesystem data. STARTSPACE_TEST_URL can override the local URL. Checks cover desktop/mobile panes, draft navigation, file writes, task links, external conflicts and new notes. No real bookmarks or user workspace are used.
