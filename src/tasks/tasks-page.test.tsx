// Verifies every Tasks page creation entry opens the same modal with the right column.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { TasksPage } from "./tasks-page";
import type { Task } from "./tasks-model";
import { DEFAULT_COLUMNS } from "./tasks-model";
const { board, grant } = vi.hoisted(() => ({
  grant: { handle: {}, permission: "granted" },
  board: { tasks: [] as Task[], columns: [] as { id: string; title: string; visible: boolean }[], loading: false, error: null, addTask: vi.fn() },
}));
vi.mock("./use-tasks", () => ({ useTasks: () => board }));
vi.mock("../hooks/useWorkspace", () => ({ useWorkspace: () => ({ grant }) }));
vi.mock("../notes/use-notes", () => ({ useNotes: () => ({ index: null }) }));
vi.mock("../hooks/useBookmarkTree", () => ({ useBookmarkTree: () => ({ tree: [] }) }));
vi.mock("../notifications/notification-context", () => ({ useNotifications: () => ({ success: vi.fn(), error: vi.fn() }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  history.replaceState(null, "", "#tasks");
  board.columns = DEFAULT_COLUMNS;
  board.tasks = [];
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
it("replaces the inline input and opens the modal from header, sidebar, and columns", async () => {
  await act(async () => root.render(<TasksPage />));
  expect(container.querySelector('[data-task-title]')).toBeNull();
  const headerAdd = [...container.querySelectorAll('header button')].find((button) => button.textContent?.includes("Add task"))!;
  await act(async () => (headerAdd as HTMLButtonElement).click());
  expect(container.querySelector('dialog[open]')).not.toBeNull();
  expect(container.querySelector<HTMLSelectElement>('dialog select')!.value).toBe("todo");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Close new task"]')!.click());
  const columnAdd = [...container.querySelectorAll('button')].filter((button) => button.textContent?.trim() === "Add task")[2]!;
  await act(async () => columnAdd.click());
  expect(container.querySelector<HTMLSelectElement>('dialog select')!.value).toBe("in-progress");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Close new task"]')!.click());
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="New task"]')!.click());
  expect(container.querySelector('dialog[open]')).not.toBeNull();
});
it("opens the modal through the global New task route", async () => {
  history.replaceState(null, "", "#tasks?new=task");
  await act(async () => root.render(<TasksPage />));
  expect(container.querySelector('dialog[open]')).not.toBeNull();
});

it("separates sidebar info and relationships into keyboard-accessible tabs while retaining drafts", async () => {
  board.tasks = [{ id: "task-one", title: "Task one", description: "Original", status: "todo", createdAt: "2026-10-15", updatedAt: "2026-10-15", noteIds: [], bookmarkIds: [] }];
  await act(async () => root.render(<TasksPage />));
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Open Task one"]')!.click());
  const sidebar = container.querySelector('[aria-label="Task details"]')!;
  const tabs = sidebar.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  expect([...tabs].map((button) => button.textContent?.trim())).toEqual(["Info", "Linked notes", "Linked bookmarks"]);
  expect(sidebar.querySelector('[role="tabpanel"]:not([hidden])')?.querySelector('[aria-label="Task title"]')).not.toBeNull();
  const input = sidebar.querySelector<HTMLInputElement>('[aria-label="Task title"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "משימה חדשה");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => tabs[1]!.click());
  expect(sidebar.querySelector('[role="tabpanel"]:not([hidden])')?.querySelector('input[role="combobox"]')?.getAttribute("placeholder")).toBe("Search notes…");
  await act(async () => tabs[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })));
  expect(tabs[2]!.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[2]);
  expect(sidebar.querySelector('[role="tabpanel"]:not([hidden])')?.querySelector('input[role="combobox"]')?.getAttribute("placeholder")).toBe("Search bookmarks…");
  await act(async () => tabs[0]!.click());
  expect(input.value).toBe("משימה חדשה");
  expect(input.getAttribute("dir")).toBe("auto");
});
