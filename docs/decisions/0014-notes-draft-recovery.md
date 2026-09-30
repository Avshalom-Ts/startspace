# ADR 0014: Device-local Notes draft recovery

Status: Accepted (2026-09-30)

## Decision

Keep one versioned unsaved Markdown buffer and its disk baseline per registered workspace in the browser's IndexedDB handle store. The registration ID, not the folder name, keys the draft; demo notes never write a recovery copy. Serialize updates so an earlier keystroke cannot overwrite a later edit or a cleanup. Surface storage errors rather than implying recovery succeeded.

After workspace permission and the file scan, offer explicit Recover or Discard before restoring the last opened note. Recover opens the stored text in Edit without immediately writing it to the workspace. Existing content comparison prevents an external change from being overwritten; missing files and revoked access do not erase the recovery copy. Successful file saves and explicit discards clear it. A stale copy that already matches saved disk content is cleared silently.

## Consequences

Unsaved note text also exists in device-local browser storage until save or discard. Portable backups do not contain it, so restoring a backup on another device does not transfer drafts. Cross-tab write coordination and Save as new file remain NOTES-04.