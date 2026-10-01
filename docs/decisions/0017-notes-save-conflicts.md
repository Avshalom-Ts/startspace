# ADR 0017: Guarded note writes across tabs

Status: Accepted (2026-09-30)

## Decision

Take a browser Web Lock for each workspace-name and relative note path around the content comparison and File System Access writable transaction. The lock prevents two participating StartSpace tabs from saving against the same baseline. Before closing the temporary writable stream, compare the disk content again; abort if an outside editor changed it during the write. Failed or conflicting saves keep the editor buffer and device-local recovery copy.

Provide Save as new file in the note menu and conflict feedback through global notifications. It creates an unused `.md` file from the retained draft and never overwrites the disk version; collisions and permission failures leave the draft intact. Successful creation selects the new note and clears the recovery copy. Do not render conflict/status banners in the Notes document pane; keep reload and Save as recovery controls in the existing document controls/menu. A persistent, dismissible top-center global interactive message with explicit actions is accepted future behavior tracked by NOTES-16; it is not implemented yet. Until then, use the existing note controls and global notifications, and never substitute a repeating inline banner.

## Limitations

External programs do not participate in browser locks. An edit made after the final comparison but before the browser commits cannot be fully excluded by the File System Access API. The UI must never claim a global filesystem transaction. Stronger folder/move verification remains NOTES-05.