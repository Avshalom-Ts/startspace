# ADR 0029: Notes navigation and pane layout

Status: Accepted
Date: 2026-10-14
Related: [ADR 0009](0009-notes-layout-transition.md),
[ADR 0012](0012-notes-selection-storage.md).

## Decision

The Notes folder explorer uses standard treeview keyboard navigation: Arrow Up
and Arrow Down move across visible folders; Arrow Right expands or enters a
folder; Arrow Left collapses or returns to its parent; Home and End move to the
first and last visible folders; Enter and Space select the focused folder.

On wide screens, people can resize the folder, note-list, and information panes
using pointer or keyboard-operable separators. Widths are device-local UI
preferences and contain no workspace data. The information inspector has a
350px minimum width so its four tabs remain usable. The information inspector is
collapsible instead of an on-demand pop-up drawer; narrow layouts retain the
existing single-region responsive stages.

Keep a per-note document scroll position only for the mounted Notes page. It is
restored when moving between notes during that visit and is discarded when the
page unmounts. This intentionally does not add a persistent note-content or
workspace metadata record.
