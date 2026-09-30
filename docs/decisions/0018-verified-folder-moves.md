# ADR 0018: Verify Notes moves before removing sources

Status: Accepted (2026-09-30)

## Decision

Route note rename through the same copy-and-delete implementation as note move. Verify the destination Markdown content and recheck the source before deleting the old file. For folder rename, copy all entries (including non-Markdown assets and nested folders), compare the source and destination directory trees and file bytes, and only then remove the original folder. Report both paths on write, verification or removal failures so the user can recover partial copies manually.

After an app-managed filesystem operation succeeds, update stable Note ID paths and historical aliases as described in ADR 0015. If metadata update fails, attempt a filesystem rollback; report both paths if rollback also fails. The Notes folder menu exposes Rename folder. Empty-folder deletion remains separately confirmed.

## Limitations

External filesystem writers do not coordinate with StartSpace. Verification reduces copy-loss risk but cannot exclude an external write in the short interval before source deletion. Very large files are compared one at a time in memory; large-workspace stress tests remain NOTES-10.
Stable task and bookmark relationships follow app-managed moves, but Markdown text that explicitly references an old file path is not rewritten.