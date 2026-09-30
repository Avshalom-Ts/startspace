# ADR 0016: Workspace-backed Notes preferences

Status: Accepted (2026-09-30)

## Decision

Store per-note favorite flags, tags and last-opened timestamps in version-one `.startspace/note-metadata.json`, keyed by stable Note ID from ADR 0015. Keep Markdown untouched. The Notes Favorites and Recent views use this portable sidecar; the device-local last-selected note path from ADR 0012 is still a separate UI preference. Demo state remains in memory only.

Validate every entry before displaying or changing metadata. A malformed file disables metadata mutation without hiding readable notes. Each write rereads current disk content and rejects an intervening external edit; a browser lock serializes participating extension tabs. A successful mutation sends a `BroadcastChannel` refresh signal without sending note data. Refreshing the window also picks up external changes. There is no network service or new extension permission.

## Consequences

The existing workspace backup includes this file without a backup schema change. Last-opened timestamps are portable; last-selected UI state and unsaved draft recovery are not. Cross-tab Markdown read-check-write coordination remains NOTES-04.