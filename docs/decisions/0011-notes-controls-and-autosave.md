# ADR 0011: Folder actions and guarded Notes autosave

Status: Accepted
Date: 2026-09-29
Related: [ADR 0010](0010-notes-context-and-feedback.md), [Notes design](../design/03-notes.md)

## Decision

The folder navigator starts closed except for the active note's ancestor chain. Each folder row, including the root, has a three-dot action menu for creating notes and subfolders in that folder. Non-root folders can be deleted only when empty, after confirmation; the filesystem service enforces this even for non-UI callers.

The document header has a single eye/pen mode toggle instead of an edit toolbar. Real note edits save after 300 ms without further typing. Ctrl/Cmd+S remains an immediate save option. Writes check the on-disk baseline; in-flight edits remain dirty for a subsequent save. Failed saves preserve the draft, surface a persistent message and one global error notification, and do not retry identical content until it changes or the user explicitly saves. Successful saves notify through the existing global notification provider. Demo edits remain in memory.

## Consequences

No new storage format, backend or autosave setting is required. Save failures and external conflicts remain recoverable; autosave does not replace the dirty-navigation guard or crash recovery tracked in NOTES-03.