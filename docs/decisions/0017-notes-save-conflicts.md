# ADR 0017: Guarded note writes across tabs

Status: Accepted (2026-09-30)

## Decision

Take a browser Web Lock for each workspace-name and relative note path around the content comparison and File System Access writable transaction. The lock prevents two participating StartSpace tabs from saving against the same baseline. Before closing the temporary writable stream, compare the disk content again; abort if an outside editor changed it during the write. Failed or conflicting saves keep the editor buffer and device-local recovery copy.

Provide Save as new file in the note menu and conflict feedback. It creates an unused `.md` file from the retained draft and never overwrites the disk version; collisions and permission failures leave the draft intact. Successful creation selects the new note and clears the recovery copy.

## Limitations

External programs do not participate in browser locks. An edit made after the final comparison but before the browser commits cannot be fully excluded by the File System Access API. The UI must never claim a global filesystem transaction. Stronger folder/move verification remains NOTES-05.