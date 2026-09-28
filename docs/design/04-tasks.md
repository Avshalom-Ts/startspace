# Tasks page decisions

Reference: Tasks-Page.png. Route: /tasks. Apply [shared decisions](00-shared-ui.md).

## Purpose and observed layout

A local personal Kanban workspace, with a task-view sidebar, four-column board and selected-task inspector. The approved columns are **Todo, In Progress, Review, Done**. Do not substitute the earlier draft's three-column board.

At the reference width use roughly 246 px sidebar, flexible 1196 px board and 330 px inspector, with 16 px gaps. Main regions start below shared search at y≈124. The center has h1 Tasks, actual task/column count and toolbar: Board/List/Calendar, Group by Status, Filter, search/filter icon and More. Default Board and Status grouping. Columns start around y=205, each approximately 295 px wide, minimum 260 px. Sidebar/inspector and columns use warm bordered panels.

Sidebar: Tasks heading with Add task/Hide sidebar; All Tasks, Today, Upcoming, Overdue, Completed with counts; divider; priority/label entries; Add label; Views. Image mixes priorities and ordinary labels under “Labels”; implement separate small Priority and Labels subsections to prevent confusing one with the other. Views contains Board in MVP; List/Calendar are later.

Column header: status circle, name, filtered count, Add task, More. Cards have completion circle, title, More, optional description excerpt, label/priority pills, due date, related-item counters. Selected card uses amber wash/border. Done cards use green checks and struck titles. Footer Add task belongs to its column. Inspector: Close, title/completion/More, Status/Priority/Due date/Labels, Description, Related Notes/Links/later Subtasks tabs, local Created/Updated metadata.

## Task model and view semantics

Persist versioned tasks.json with stable ID, title, optional description, status (todo/in_progress/review/done), previous non-Done status, priority (none/high/medium/low), optional date-only due date, label IDs, order, note IDs, browser bookmark IDs, createdAt and updatedAt. Labels have stable IDs, unique case-insensitive names and palette color. No assignee, account, server history or comments.

All Tasks includes all statuses. Today: incomplete due today. Upcoming: incomplete due tomorrow or later. Overdue: incomplete before today. Completed: Done. Compare due dates against the local calendar date, not UTC midnight. Undated tasks appear in All Tasks only, unless matched by labels/priority. Smart-view counts are computed before additional label/text filters. Column counts reflect the current result set; subtitle reports visible and total when filtered.

Label/priority filters combine with selected smart view and text using AND; multiple chosen labels use OR. Filter button opens labeled controls for priority, labels and due-date presence; active filters appear as removable chips. Clear filters retains the smart view. Global task-search handoff opens All Tasks with a title/description text filter. The toolbar search icon opens this labeled local filter field; it never replaces global search.

## Creation, selection and editing

Global/side New task creates Todo; column Add creates in that column. Open the inspector with a new draft, focus required Title. Inspector edits are staged with explicit Save/Cancel footer, a functional addition absent from the image. Show Unsaved changes; leaving selection/page asks Save/Discard/Cancel. Save closes a creation draft only after the file write succeeds, then keeps the saved task selected. Cancel a dirty draft asks before discarding.

Click card body or press Enter to select/open inspector. Completion/More controls remain separate. Title required after trimming; description plain text for MVP. Select Status, Priority, date picker (with clear action), labels. No fabricated defaults: priority None and due date blank on new tasks.

Card completion immediately moves to Done, storing its previous non-Done status; unchecking restores it, default Todo. Status changes append to target column. Explicit Move to / Move up / Move down menu actions are the required accessible ordering method. Optional pointer drag may use the same operations later. Under filtering, disable reorder/drag to avoid ambiguous ordering but permit Move to. Column More in MVP offers only Add task; omit if redundant, do not show inert column configuration.

Delete names the task and removes only the task/its edges, never related files/bookmarks. Immediate card mutations revert on failed persistence and show inline retry. Inspector failure preserves edited fields.

## Relations and activity

Notes/Links tabs show counts, title, context path/URL and a Link existing action. Pickers search local sources. Adding/removing writes canonical task edges. Open note selects its file; open link resolves browser URL. Missing target shows last-known label plus Missing note/bookmark, Relink and Remove relation. Never guess a replacement by title/URL.

Counter icons in cards represent Notes and Links with accessible names, not comments. Hide zero counters. The screenshot's Subtasks tab is later. Activity in MVP is only Created and Updated timestamps with a neutral clock icon; replace the sample “A” avatar so it does not imply an account. No remote activity feed.

## States

No workspace: Choose workspace instead of invented sample board. Loading: four skeleton columns with status names. Empty board: retain all four headers and show New task; each empty column says “No tasks”. No filter results: Clear filters. Permission loss: read-only cached board, stale notice and Reconnect. Malformed/newer task schema: preserve the file and disable task writes; show Retry after repair, not a reset button. External conflict: retain inspector draft and offer reload/reapply after review. Missing selection closes inspector with explanation. Invalid title keeps focus/error in inspector.

## Responsive and accessibility

At 1024–1439 px sidebar is 220 px, inspector a 340 px drawer, board horizontally scrolls within its own named region with 280 px columns. At 768–1023 px sidebar becomes a drawer. Below 768 px show a status tab/select control and one full-width column at a time; inspector is a full-screen sheet. Preserve view/filter/scroll when closing detail. Do not make the whole page horizontally scroll.

Columns are labeled sections containing task lists. Completion uses task-specific checked state. Status/priority have text as well as color. Menu move actions announce destination and preserve focus on moved card. Dialog/sheet contains focus only while modal. Related tabs use keyboard selection. Close obeys dirty guard; deleting focuses next card or Add task. All fields have visible labels and associated errors.

## MVP versus later

MVP: four fixed columns, smart views, priorities, due dates, labels, filtering, card ordering via menu, complete/reopen, editable inspector, note/bookmark relations and local timestamps. Later: List/Calendar views, alternate grouping, custom columns, pointer drag, subtasks, recurring tasks and local reminders. Hide those deferred view/grouping controls rather than making them nonfunctional. Show “Grouped by status” as static toolbar text in MVP.

## Acceptance

Create task in Review, save/reopen and verify status. Complete/reopen restores prior status. Test Today/Upcoming/Overdue around local midnight and timezone changes. Move/order by keyboard, including filtered restrictions. Link real note/bookmark then rename/delete targets. Verify failure rollback, retained drafts, malformed data protection, live counts and mobile one-column navigation.

