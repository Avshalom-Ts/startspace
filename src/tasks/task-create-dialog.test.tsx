// Exercises the simple task creation modal, RTL content, and save failures.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TaskCreateDialog } from "./task-create-dialog";
import { DEFAULT_COLUMNS } from "./tasks-model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
const onCreate = vi.fn();
const onClose = vi.fn();
beforeEach(() => {
  onCreate.mockReset().mockResolvedValue(true);
  onClose.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); }) });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); }) });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

/** Mounts the creation modal with a nondefault initial column and synthetic targets. */
async function render() {
  await act(async () => root.render(<TaskCreateDialog
    columns={DEFAULT_COLUMNS} initialStatus="in-progress"
    onCreate={onCreate} onClose={onClose}
  />));
}

/** Changes a React-controlled text field using the native browser value setter. */
async function fill(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Submits the form without invoking browser constraint validation. */
async function submit() {
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

it("creates title, description, and column together, preserving RTL text", async () => {
  await render();
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(container.querySelector('input:not([type="checkbox"])'));
  expect(container.querySelector('input:not([type="checkbox"])')?.getAttribute("dir")).toBe("auto");
  expect(container.querySelector("textarea")?.getAttribute("dir")).toBe("auto");
  await fill('input:not([type="checkbox"])', "  משימה חדשה  ");
  await fill("textarea", "وصف المهمة with English");
  expect(container.querySelector('[role="combobox"]')).toBeNull();
  await submit();
  expect(onCreate).toHaveBeenCalledWith({ title: "משימה חדשה", description: "وصف المهمة with English", status: "in-progress" });
  expect(onClose).toHaveBeenCalledOnce();
});

it("keeps the draft open on failure, supports retry, and rejects blank titles", async () => {
  await render();
  await fill('input:not([type="checkbox"])', "  ");
  await submit();
  expect(onCreate).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Enter a task title.");
  await fill('input:not([type="checkbox"])', "Keep my draft");
  onCreate.mockResolvedValueOnce(false);
  await submit();
  expect(onClose).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLInputElement>('input:not([type="checkbox"])')?.value).toBe("Keep my draft");
  await submit();
  expect(onCreate).toHaveBeenCalledTimes(2);
  expect(onClose).toHaveBeenCalledOnce();
});

it("prevents repeated submission and cancellation while saving", async () => {
  let resolve!: (value: boolean) => void;
  onCreate.mockImplementation(() => new Promise<boolean>((done) => { resolve = done; }));
  await render();
  await fill('input:not([type="checkbox"])', "Task");
  await submit();
  await submit();
  await act(async () => container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })));
  expect(onCreate).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
  expect(container.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(true);
  await act(async () => resolve(true));
  expect(onClose).toHaveBeenCalledOnce();
});

it("cancels without creating and restores focus to the invoking control", async () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  await render();
  await act(async () => container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onCreate).not.toHaveBeenCalled();
  await act(async () => root.render(null));
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
