// Covers searchable task relationship selection, keyboard controls, and persistent selections.
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LinkPicker from "./task-link-picker";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const onSubmit = vi.fn();
const items = [
  { id: "stable-a", label: "שלום", detail: "work/alpha.md" },
  { id: "stable-b", label: "Project", detail: "work/beta.md" },
  { id: "stable-c", label: "Project", detail: "personal/project.md" },
];
/** Hosts the picker with real selection state inside a form. */
function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <LinkPicker title="Link notes" items={items} selected={selected}
      onToggle={(id) => setSelected((ids) => ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id])} />
    <button type="button">Outside picker</button>
  </form>;
}
beforeEach(async () => {
  onSubmit.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
/** Focuses and edits the search input through native DOM events. */
async function search(query: string) {
  const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, query);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}
/** Sends a keyboard command to the picker. */
async function key(value: string) {
  const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const event = new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true });
  await act(async () => input.dispatchEvent(event));
  return event;
}
it("shows all items on focus and filters by title and note path", async () => {
  expect(container.querySelector('[role="listbox"]')).toBeNull();
  const input = await search("");
  expect(input.getAttribute("dir")).toBe("auto");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(3);
  await search("project");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(2);
  await search("BETA.MD");
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(1);
  expect(container.querySelector('[role="option"]')?.textContent).toContain("work/beta.md");
  await search("missing");
  expect(container.querySelector('[role="status"]')?.textContent).toBe("No matches");
});
it("retains multiple links across searches and unlinks from a selected chip", async () => {
  await search("alpha");
  await act(async () => container.querySelector<HTMLButtonElement>('[role="option"]')!.click());
  await search("beta");
  await act(async () => container.querySelector<HTMLButtonElement>('[role="option"]')!.click());
  expect(container.querySelector('[aria-label="Unlink שלום"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="Unlink Project"]')).not.toBeNull();
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Unlink שלום"]')!.click());
  expect(container.querySelector('[aria-label="Unlink שלום"]')).toBeNull();
  await search("");
  expect(container.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
});
it("uses Arrow keys and Enter for selection, and Escape closes only the dropdown", async () => {
  const input = await search("");
  await key("ArrowDown");
  const activeId = input.getAttribute("aria-activedescendant");
  expect(container.querySelector(`[id="${activeId}"]`)?.textContent).toContain("שלום");
  expect((await key("Enter")).defaultPrevented).toBe(true);
  expect(container.querySelector('[role="option"]')?.getAttribute("aria-selected")).toBe("true");
  expect(onSubmit).not.toHaveBeenCalled();
  const escape = await key("Escape");
  expect(escape.defaultPrevented).toBe(true);
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(container.querySelector('[role="listbox"]')).toBeNull();
});
it("closes on focus leaving the picker and handles an empty source", async () => {
  await search("");
  await act(async () => container.querySelector<HTMLButtonElement>('form > button')!.focus());
  expect(container.querySelector('[role="listbox"]')).toBeNull();
  await act(async () => root.render(<LinkPicker title="Link bookmarks" items={[]} selected={[]} onToggle={vi.fn()} />));
  await search("");
  expect(container.querySelector('[role="status"]')?.textContent).toBe("None available");
});
