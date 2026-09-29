# ADR 0012: Device-local Notes selection per workspace

Status: Accepted
Date: 2026-09-30
Related: [ADR 0010](0010-notes-context-and-feedback.md)

## Decision

Register each granted File System Access directory handle with a random ID in the existing `startspace.workspace` IndexedDB store. Keep earlier registrations when the current workspace changes; use `isSameEntry` to reuse an ID when the same directory is selected again, even if other folders have the same name. Migrate a legacy bare current handle by assigning it an ID without changing or deleting workspace files. Extension configuration uses this registration ID instead of a name-derived value.

Store the last successfully opened real note as `{ version: 1, noteId }` under that registration ID in the same device-local store. The path is relative; no note body or absolute path is stored. Restore after permission and indexing, unless an explicit note route or new-note action takes precedence. Ignore late restoration when the user selects another note or workspace. Update after app-managed moves and renames; clear after deletion or confirmed disappearance, not temporary read failures. Demo notes never read or write this preference.

## Consequences

Returning to Notes resumes the document and reveals its folder without changing Markdown files or workspace backups. Selection preferences are device-local, not portable note metadata; draft recovery remains a separate task.