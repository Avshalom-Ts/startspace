# ADR 0023: Tasks page design

Status: Accepted (design target)
Date: 2026-10-01
Related: ADR 0001, [ADR 0002](0002-manifest-permissions-storage.md), [ADR 0020](0020-shared-ui-search-and-data.md). Visual: [Tasks-Page.png](../references/Tasks-Page.png).

## Context

ADR 0001 defines local Kanban tasks linkable to notes and bookmarks; ADR 0002 left the task format open. Tasks are implemented as a versioned `tasks.json` at the workspace root with customizable columns. This ADR records the Tasks design.

## Decision

### Composition

Task-view sidebar, board and selected-task inspector. At the reference width: about 246 px sidebar, flexible board, 330 px inspector, 16 px gaps, starting below the shared search. Center: h1 Tasks, real task/column count and toolbar (Board, static “Grouped by status” text, Filter, local filter field). Columns ≈295 px wide (min 260 px).

- **Sidebar:** Tasks heading with Add task and Hide sidebar; All Tasks, Today, Upcoming, Overdue, Completed with counts; separate Priority and Labels subsections; Add label; Views (Board in MVP).
- **Column header:** status circle, name, filtered count, Add task. Column More only when it has real actions.
- **Card:** completion circle, title, More, optional description excerpt, label/priority pills, due date, Notes/Links counters (hidden at zero). Selected: amber wash/border. Done: green check and struck title. Column footer Add task.
- **Inspector:** Close, title/completion/More, Status, Priority, Due date, Labels, Description, Related Notes / Links tabs (Subtasks later), Created/Updated with a neutral clock icon (no avatar).

### Task model

Default statuses **Todo, In Progress, Review, Done**. Task fields: stable ID, title, optional description, status, previous non-Done status, priority (none/high/medium/low), optional date-only due date, label IDs, order, note IDs, bookmark IDs, createdAt, updatedAt. Labels have stable IDs, unique case-insensitive names and a palette color. No assignee, account, history or comments.

### Views and filters

All Tasks: every status. Today: incomplete due today. Upcoming: incomplete due later. Overdue: incomplete before today. Completed: Done. Compare to the local calendar date. Undated tasks appear only in All Tasks unless matched by label/priority. Smart counts are computed before label/text filters; column counts reflect the current result; the subtitle shows visible and total when filtered. Label/priority filters AND with the smart view and text; multiple labels OR. Active filters appear as removable chips; Clear filters keeps the smart view. Global search handoff opens All Tasks with a text filter. The local filter never replaces global search.

### Creation and editing

New task creates Todo; column Add creates in that column. The inspector opens a draft focused on Title. Inspector edits use explicit Save/Cancel with Unsaved changes and a Save/Discard/Cancel guard; a draft closes only after a successful write and stays selected. Title required after trimming; description plain text; priority None and due date blank by default. Card completion moves to Done storing the prior status; unchecking restores it (default Todo). Status change appends to the target column. Ordering uses Move to / Move up / Move down menu actions; drag later. Under filters, disable reordering but allow Move to. Delete names the task and removes only it and its edges. Immediate card mutations revert on failure with inline retry; inspector failures keep fields.

### Relations

Notes/Links tabs show counts, titles, path/URL and Link existing. Pickers search local sources; adding/removing writes task edges. Missing targets show last-known label, Missing note/bookmark, Relink and Remove; never guess by title/URL.

### States

No workspace: Choose workspace, never a sample board. Loading: skeleton columns with names. Empty board: all headers with New task; empty columns say “No tasks”. No filter results: Clear filters. Permission loss: read-only cached board, stale notice, Reconnect. Malformed/newer schema: preserve the file, disable writes, Retry after repair. External conflict: keep the inspector draft and offer reload/reapply. Missing selection closes the inspector with an explanation.

### Responsive and accessibility

1024–1439 px: 220 px sidebar, 340 px inspector drawer, board scrolls horizontally in its own region with 280 px columns. 768–1023 px: sidebar drawer. <768 px: status tab/select with one full-width column; inspector full-screen sheet. Preserve view/filter/scroll when closing detail; no page-level horizontal scroll. Columns are labeled sections; completion has checked state; status/priority have text; move actions announce destination and keep focus; modal focus only when modal; deleting focuses the next card or Add task.

### Scope

MVP: default four statuses, smart views, priorities, due dates, labels, filtering, menu ordering, complete/reopen, editable inspector, note/bookmark relations, local timestamps. Later: List/Calendar views, alternate grouping, pointer drag, subtasks, recurring tasks, local reminders. Hide deferred controls.

## Conflicts with existing decisions (existing wins)

| Design point | Existing decision | Outcome |
| --- | --- | --- |
| Four fixed columns; custom columns later | Implemented customizable columns (working feature; ADR 0020 precedence) | Customizable columns stay; the four statuses become the default set. Migration of existing column IDs needs its own decision. |
| `.startspace/tasks.json` | Existing `tasks.json` at the workspace root | Deferred (ADR 0020). |

## Acceptance

Create a task in Review, save/reopen and verify status. Complete/reopen restores the prior status. Today/Upcoming/Overdue behave correctly around local midnight and timezone changes. Keyboard ordering works, including filtered restrictions. Linked note/bookmark rename/delete is handled. Failure rollback, retained drafts, malformed data protection, live counts and mobile one-column navigation work.
