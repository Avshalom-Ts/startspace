// task-board-columns.test.ts
//
// Verifies the Task board's display-column sequence. The board keeps persisted
// Kanban columns intact and always appends an interactive add-column placeholder.

import { describe, expect, it } from "vitest";
import { buildTaskBoardColumns } from "./task-board-columns";
import { DEFAULT_COLUMNS } from "./tasks-model";

describe("buildTaskBoardColumns", () => {
  it("shows the three default columns followed by an add-column placeholder", () => {
    const items = buildTaskBoardColumns(DEFAULT_COLUMNS);

    expect(items).toHaveLength(4);
    expect(items.slice(0, 3)).toEqual([
      { kind: "column", column: DEFAULT_COLUMNS[0] },
      { kind: "column", column: DEFAULT_COLUMNS[1] },
      { kind: "column", column: DEFAULT_COLUMNS[2] },
    ]);
    expect(items[3]).toEqual({ kind: "add-column" });
  });

  it("still appends the placeholder after four visible columns exist", () => {
    const fourthColumn = { id: "review", title: "Review", visible: true };
    const items = buildTaskBoardColumns([...DEFAULT_COLUMNS, fourthColumn]);

    expect(items).toEqual([
      { kind: "column", column: DEFAULT_COLUMNS[0] },
      { kind: "column", column: DEFAULT_COLUMNS[1] },
      { kind: "column", column: DEFAULT_COLUMNS[2] },
      { kind: "column", column: fourthColumn },
      { kind: "add-column" },
    ]);
  });

  it("only includes visible persisted columns before the placeholder", () => {
    const items = buildTaskBoardColumns([
      DEFAULT_COLUMNS[0]!,
      { ...DEFAULT_COLUMNS[1]!, visible: false },
    ]);

    expect(items).toEqual([
      { kind: "column", column: DEFAULT_COLUMNS[0] },
      { kind: "add-column" },
    ]);
  });
});
