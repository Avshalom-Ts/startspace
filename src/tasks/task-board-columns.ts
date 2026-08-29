// task-board-columns.ts
//
// Builds the Tasks page's transient Kanban display sequence. Persisted columns
// remain task data; the final add-column item exists only in the UI and is not
// saved to the workspace.

import type { TaskColumn } from "./tasks-model";

export type TaskBoardColumnItem =
  | { kind: "column"; column: TaskColumn }
  | { kind: "add-column" };

export const MAX_VISIBLE_TASK_COLUMNS = 4;

/**
 * Returns visible persisted columns followed by one add-column placeholder,
 * always present as the last item (reachable via the board's scroll arrows).
 *
 * @param columns - All saved board columns, including hidden columns.
 * @returns Visible column items in saved order plus a trailing add-column item.
 */
export function buildTaskBoardColumns(
  columns: TaskColumn[],
): TaskBoardColumnItem[] {
  const visibleColumnItems = columns
    .filter((column) => column.visible)
    .map((column) => ({ kind: "column" as const, column }));

  return [...visibleColumnItems, { kind: "add-column" }];
}
