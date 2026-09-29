# ADR 0009: Incremental Notes layout transition

Status: Accepted for feature/notes-layout
Date: 2026-09-28

## Context

The approved Notes image and docs/design/03-notes.md replace the previous two-pane visual target. The current workspace uses relative note paths, H1-derived search titles, tasks.json and browser-local bookmark metadata. A visual change must not silently migrate those stores.

## Decision

Adopt the four-pane Notes composition: folder navigator, scoped note list, document preview/editor and information/relations. Put the existing global search beneath the top navbar on Notes. Use filenames as Notes display labels while preserving path IDs and the current H1 search index. Retain existing light/dark preference rather than removing a working feature.

This supersedes ADR 0003's two-pane layout, folder-selection behavior and prohibition on global search on Notes. Its real Markdown, directory ownership and permission principles remain. Stable note UUIDs, note metadata persistence and portable relations are deferred to a separately reviewed migration. No schema changes occur in this branch.

Support safe Markdown preview, explicit save, conflict checks and Save/Discard/Cancel navigation. Task relationships use the current task noteIds. Existing bookmark relations are read-only. Retain note CRUD; folder rename/deletion UI will return after safe relationship migration and empty-folder-only deletion are implemented.

Demo mode is explicit and uses synthetic in-memory data. It cannot persist demo notes/favorites or modify user files. Tags and favorites are marked planned in real workspaces; no false saved indicators.

## Consequences

The design can be reviewed while current data remains compatible. Some design features remain incomplete and are tracked in docs/design/notes-layout-tasks.md. The current session-only Recent list is not a persisted history. No browser store release or commit is authorized by this decision.


## Follow-up decision

[ADR 0010](0010-notes-context-and-feedback.md) adds accepted, not-yet-implemented requirements for remembered note selection, collapsed folders with active-note ancestor expansion, and existing global notifications. It does not migrate note storage.
