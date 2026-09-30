# ADR 0015: Portable note identities and legacy relationship migration

Status: Accepted (2026-09-30)

## Decision

Keep Markdown paths as file locations and search/navigation targets, but use stable `note-<UUID>` IDs for task and bookmark relationships. Store a version-one mapping of IDs to relative `.md` paths, plus historical path aliases, in `.startspace/note-identities.json` in the granted workspace. Scanning Notes reconciles unindexed paths without replacing existing IDs. The existing portable backup already includes all workspace files, so no backup version change is needed; old backups without the sidecar receive IDs when Notes next indexes their files.

After the sidecar is durable, convert legacy path links in `tasks.json` and browser bookmark metadata to stable IDs. Preserve missing references verbatim and deduplicate links that resolve to the same note. If the bookmark write fails after updating tasks, restore the original task document. Malformed metadata is not overwritten: the note list remains readable and displays the error. New task links use stable IDs; historical aliases allow old path links and backups to resolve after app-managed note/folder moves.

On an app-managed move or rename, keep the ID and map old paths as aliases. If metadata cannot be updated after the file operation, attempt a filesystem rollback; partial recovery names both paths. On confirmed deletion, convert legacy links first, retire the ID after removing the file, and attempt to restore the file if metadata retirement fails. A new file reusing a deleted path receives a new ID.

## Consequences

Notes remain ordinary Markdown and can be read by external editors. Moving files outside StartSpace cannot reliably identify whether a new path belongs to the same note; such changes may require relinking. Metadata writes to separate browser and workspace stores are not a global atomic transaction. Cross-tab coordination and stronger filesystem move verification remain NOTES-04 and NOTES-05.