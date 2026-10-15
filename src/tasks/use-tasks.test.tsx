// Verifies complete task creation is saved atomically through the workspace bridge.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { useTasks } from "./use-tasks";
import { DEFAULT_COLUMNS } from "./tasks-model";
const { writeTasks, grant } = vi.hoisted(() => ({ writeTasks: vi.fn(), grant: { handle: {}, permission: "granted" } }));
vi.mock("../hooks/useWorkspace", () => ({ useWorkspace: () => ({ grant }) }));
vi.mock("./task-workspace", () => ({
  readTasks: async () => ({ version: 1, columns: DEFAULT_COLUMNS, tasks: [] }),
  writeTasks,
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let board: ReturnType<typeof useTasks>;
/** Captures the real state bridge without rendering task content. */
function Harness() { board = useTasks(); return null; }
beforeEach(async () => {
  writeTasks.mockReset().mockResolvedValue(undefined);
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Harness />));
});
afterEach(async () => { await act(async () => root.unmount()); });
it("saves title, description, column, and links in a single write", async () => {
  await act(async () => {
    const task = await board.addTask("  משימה  ", "in-progress", { description: "وصف", noteIds: ["stable-note"], bookmarkIds: ["b1"] });
    expect(task).toMatchObject({ title: "משימה", description: "وصف", status: "in-progress", noteIds: ["stable-note"], bookmarkIds: ["b1"] });
  });
  expect(writeTasks).toHaveBeenCalledOnce();
  expect(writeTasks.mock.calls[0]![1].tasks).toHaveLength(1);
});
it("rejects invalid titles and stale columns without writing", async () => {
  await act(async () => {
    expect(await board.addTask("   ", "todo")).toBeNull();
    expect(await board.addTask("Task", "deleted-column")).toBeNull();
  });
  expect(writeTasks).not.toHaveBeenCalled();
});
it("does not add a partial task after a failed workspace write", async () => {
  writeTasks.mockRejectedValueOnce(new Error("Synthetic write failure"));
  await act(async () => {
    expect(await board.addTask("Task", "todo", { description: "Full draft", noteIds: ["note"] })).toBeNull();
  });
  expect(board.tasks).toEqual([]);
  expect(board.error).toBe("Synthetic write failure");
});
