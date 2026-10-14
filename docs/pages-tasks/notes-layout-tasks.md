# Notes layout implementation tasks

Branch: feature/notes-layout. Visual source: [Notes reference](../references/Notes-Page.png).
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
- [x] NOTES-01: versioned portable note IDs, legacy relationship migration, and historical path aliases. See [ADR 0015](../decisions/0015-stable-note-identities.md).
- [x] NOTES-02: workspace-backed note favorites, tags and recent opens with validation, external-edit detection and cross-tab refresh. See [ADR 0016](../decisions/0016-note-preferences.md).
- [x] NOTES-03: device-local draft recovery with explicit Recover / Discard and guarded saves. See [ADR 0014](../decisions/0014-notes-draft-recovery.md).
- [x] NOTES-04: browser-locked note saves, conflict-preserving drafts and collision-safe Save as new file. See [ADR 0017](../decisions/0017-notes-save-conflicts.md).
- [x] NOTES-05: verified note moves/renames and recursive folder rename with original files preserved on copy mismatch; stable Note IDs and historical paths follow app-managed moves. See [ADR 0018](../decisions/0018-verified-folder-moves.md).
- [x] NOTES-07: Notes settings now explicitly controls remote Markdown images; encoded relative Markdown links and heading fragments open the linked note and section.
- [x] NOTES-08: The folder tree supports standard keyboard navigation; desktop panes resize and retain their widths; note scroll positions are restored during the visit. The persistent inspector is collapsible rather than a pop-up drawer.
- [x] NOTES-09: A global top-navigation New menu opens existing bookmark, note, and task creation flows. Shared search now provides combobox/listbox semantics and announces result counts and keyboard selection.

## Remaining work

| ID | Priority | Task / acceptance criteria | Current UI |
| --- | --- | --- | --- |
| NOTES-10 | P2 | Restore directory import UI and test real browser permission revocation, recovery, very large workspaces and disk encoding edge cases. | Existing import services unchanged; new Notes UI does not expose import. |
| NOTES-16 | P2 | Implement a persistent top-center global interactive message for cases that need a user decision: provide accessible explicit actions and dismiss, remain visible until acted on or dismissed, and deduplicate updates so it never reappears on every keystroke. Preserve the existing transient notification behavior for ordinary feedback; keep messages outside page work areas. | Existing global notification stack is transient/top-right; no persistent top-center interactive message exists yet. |

## Newly accepted requirements (2026-09-29)

Implemented for NOTES-12 through NOTES-14. See [ADR 0010](../decisions/0010-notes-context-and-feedback.md) for the authoritative behavior.

- [x] **NOTES-12 · P1 — Restore the last opened note per workspace.** A versioned device-local relative path follows the registered handle ID. Restoration waits for permission and the workspace scan; explicit links/new-note actions take precedence. Successful opens and app-managed moves/renames update it; deletion and confirmed missing files clear it. Demo state remains separate. See [ADR 0012](../decisions/0012-notes-selection-storage.md). Draft recovery is handled separately by NOTES-03.
- [x] **NOTES-13 · P1 — Collapse folders by default and reveal the opened note.** Open only the active note's ancestor chain on entry, preserve manual disclosure during the visit, reveal explicitly opened notes, and reset on workspace switch. Last-note restoration is tracked separately in NOTES-12.
- [x] **NOTES-14 · P1 — Standardize Notes feedback on global notifications.** File actions, save results and task links use existing global notifications. No save-status banner is shown inside the document; invalid names/collisions remain inline and write failures retain drafts.
- [x] **NOTES-15 · P1 — Browse and preview local images.** PNG, JPEG, GIF, WebP and AVIF files appear with thumbnails in the selected folder's content list and open in the document pane. Workspace-relative Markdown images (including nested assets and encoded spaces) render through the granted File System Access handle. Escaping paths, remote URLs and unsupported formats remain placeholders; missing or inaccessible files show unavailable placeholders. Object URLs are revoked when images, notes or workspaces change. Unit tests cover nested paths, missing images, denied access and cleanup. Remote-image consent is a Notes-page setting in NOTES-07.

## Updated Notes controls (2026-09-29)

Each folder row (including root) provides New note and New folder in a three-dot menu. Non-root rows also offer confirmed empty-folder-only Delete. The note header has an eye/pen mode toggle; edits save after 1 second of inactivity and show a global success notification. Ctrl/Cmd+S remains available. Save conflicts and failures retain the draft and surface global errors. See [ADR 0011](../decisions/0011-notes-controls-and-autosave.md).

## Demo and real-data boundaries

Use Notes → Preview the layout when disconnected, or #notes?demo=1. The banner always identifies the preview. Synthetic note edits and favorites last only while that preview is mounted. File mutation dialogs do not write. Exit preview returns to the real connection state. No service/network calls are added for demo content; external reference links navigate only when clicked.

Real relationships use stable Note IDs; old relative-path links are migrated on Notes indexing, with historical aliases for app-managed moves. Note favorites, tags and recent timestamps live in the workspace; crash drafts remain device-local. Do not remove working APIs/features from other pages because a new design marked them “later”.

## Validation and rerun

Run bun run build and bun run test. Browser automation for Notes is not yet configured in package.json; use a synthetic workspace in an unpacked Chromium extension for manual image browsing and Markdown preview checks. No real bookmarks or user workspace are used in automated tests.
