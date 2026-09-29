# ADR 0010: Restore Notes context and reuse global feedback

Status: Accepted; NOTES-12 through NOTES-14 implemented
Date: 2026-09-29
Related: [ADR 0009](0009-notes-layout-transition.md), [Notes design](../design/03-notes.md), [implementation tasks](../design/notes-layout-tasks.md)

## Context

The user wants Notes to reopen the last successfully opened file, start with a collapsed folder tree except the active note's ancestors, and reuse the existing global notification system. This decision adds those requirements to the new layout; it does not claim they are implemented.

## Decision 1: Restore the last opened note

- Remember the last successfully opened real note separately for each workspace. Restore it when returning to Notes, reopening the extension tab, or restarting the browser, after the same workspace is connected and permission is granted.
- Store a versioned UI preference in device-local browser storage alongside the registered workspace identity. Key by the workspace's persistent handle registration ID, never only its display name. Reconnecting the same directory uses the same identity; distinct same-named folders must not share state.
- Initially retain the current relative file path. Migrate this preference to stable note IDs when NOTES-01 lands; do not block restoration on that larger migration. Store no note contents or absolute paths in this preference.
- An explicit note link/search result takes precedence over remembered selection. A new-note action takes precedence too. Failed opens must not replace the last successful selection.
- On automatic restoration, select the note's containing folder/list, highlight the note and open its saved contents in Preview. On narrow screens show the document stage. Do not steal keyboard focus on startup.
- If permission is missing, keep the remembered reference and show Reconnect. Never launch a permission prompt automatically. After reconnection, retry restoration.
- If the file is definitively missing, clear its obsolete reference and show the existing Select a note state plus one global informational notification. Do not pick another file arbitrarily. A temporary read/permission error retains the reference and offers retry.
- Successful app-managed rename/move updates the remembered path; deletion clears it. Workspace switching restores only that workspace's selection. A slow restoration request must not override a newer user selection.
- Demo selection is memory-only and cannot read or update the real-workspace preference. Disconnect clears visible data; it need not delete the remembered UI preference.
- This remembers selection, not unsaved text. Draft/crash recovery remains NOTES-03; ordinary dirty-navigation guards still apply.

## Decision 2: Start with a collapsed folder tree

- Each fresh Notes page entry starts with all folders collapsed. The workspace root label remains visible.
- After a note is restored or explicitly opened, expand its ancestor chain from the root through its containing folder. Keep unrelated branches collapsed on initial entry. Root-level notes require no folder expansion.
- Opening another note during the same visit expands its required ancestors but preserves branches the user manually opened or closed elsewhere. Do not reset the entire tree on every render, refresh, save or filter change.
- Allow the user to collapse the active note's branch after revealing it; it stays collapsed until another explicit note-open/reveal action. Do not fight a manual collapse through an effect.
- Folder selection and disclosure are separate actions. Opening a note through search, a task relation or a Markdown link reveals the same ancestor chain.
- On workspace switch, discard the old expansion set and apply the new workspace's restored-note chain. Folder renames/moves reconcile affected expansion paths; deleted paths are removed.
- Use accessible expanded state and keyboard disclosure behavior. Reveal a selected list row without stealing focus. Do not persist the entire expansion set across visits: the next visit follows the collapsed-plus-active-chain rule again.

## Decision 3: Reuse existing global notifications

Use the existing NotificationProvider, useNotifications and NotificationViewport. Do not create a Notes-specific toast/banner system for transient operation feedback. ADR 0011 supersedes the explicit Save control and visible status row with guarded autosave and an accessible save-state announcement.

| Feedback | Presentation |
| --- | --- |
| Successful create/delete/rename/move, task-link change | One global success notification after confirmed persistence |
| Successful real-note save | One global success notification after confirmed persistence; no in-document status banner |
| Operation failure | One global error notification with concise recovery guidance/action; retain editor/dialog input |
| Missing remembered note | One global informational notification, then normal empty selection |
| Filename collision, empty/invalid form field | Inline field validation in the open dialog |
| Workspace unavailable, permission revoked, unresolved disk conflict | Persistent contextual recovery UI; use global error once for the failed operation, not on every render |
| Demo mode / planned feature explanation | Persistent informational labeling; no false real-file success |

Create/delete already use parts of the global system. Audit remaining local message paths and unify operation-specific wording. Distinguish “Note created”, “Folder created”, “Note renamed”, “Note moved” and “Note deleted” rather than generic “Workspace updated”. Failed saves preserve drafts and keep Save/Discard/Cancel open. Cancelled actions are neutral. Suppress duplicate notifications for a single action; no repeating toast on rerender, focus refresh or initial restoration success. Keep live announcements accessible without duplicate competing alerts.

## Implementation and validation

Tracked as NOTES-12, NOTES-13 and NOTES-14. NOTES-13 integrates with NOTES-12 but also handles explicit note opens independently. NOTES-14 can ship separately. Test return navigation, reload/restart, same-named workspaces, reconnect, missing files, rename/move/delete, slow restoration races, collapsed ancestors, manual disclosure, direct links, demo isolation and notification success/failure/deduplication.

## Consequences

Users resume their place without turning UI preferences into note storage. The folder tree remains calm and predictable. Feedback follows the existing app-wide pattern while field validation and persistent recovery controls stay close to their context. No backend, cloud synchronization or note-file format change is introduced.

