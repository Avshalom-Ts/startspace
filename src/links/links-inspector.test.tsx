import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LinksInspector } from "./links-inspector";
import { emptyBookmarkMetadata } from "./bookmark-metadata-model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const fetch = vi.fn();
beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  fetch.mockReset().mockResolvedValue(undefined);
});
afterEach(async () => { await act(async () => root.unmount()); });
async function render(
  description: string,
  available = true,
  tasks: {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    noteIds: string[];
    bookmarkIds: string[];
  }[] = [],
  onSetTaskLink = vi.fn().mockResolvedValue(true),
) {
  await act(async () => root.render(<LinksInspector
    node={{ id: "synthetic", title: "Synthetic", url: "https://example.com" }}
    meta={{ ...emptyBookmarkMetadata(), description }}
    folderPath="" notes={[]} tasks={tasks}
    metadataAvailable={available}
    onClose={vi.fn()} onToggleFavorite={vi.fn()} onUpdateMetadata={vi.fn().mockResolvedValue(undefined)}
    onSetTaskLink={onSetTaskLink}
    onOpen={vi.fn()} onCopy={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onTagClick={vi.fn()}
    onFetchDescription={fetch}
  />));
  return onSetTaskLink;
}

it("fetches directly from the details button and displays the updated editable description", async () => {
  await render("Original");
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Fetch description")!;
  await act(async () => button.click());
  expect(fetch).toHaveBeenCalledWith("synthetic");
  await render("Fetched description");
  expect(container.querySelector('[title="Edit description"]')?.textContent).toBe("Fetched description");
  expect(container.textContent).not.toContain("Apply");
});

it("disables metadata controls without a connected workspace", async () => {
  await render("Original", false);
  expect(container.querySelector<HTMLButtonElement>('[aria-label="Add to favorites"]')?.disabled).toBe(true);
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Fetch description")!;
  await act(async () => button.click());
  expect(fetch).not.toHaveBeenCalled();
});

it("links an existing task to the selected bookmark", async () => {
  const setTaskLink = vi.fn().mockResolvedValue(true);
  await render("Original", true, [{
    id: "task-1",
    title: "Review release",
    description: "",
    status: "todo",
    createdAt: "",
    updatedAt: "",
    noteIds: [],
    bookmarkIds: [],
  }], setTaskLink);
  await act(async () => {
    container.querySelector<HTMLButtonElement>("#links-tab-tasks")?.click();
  });
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Link existing task"),
    )?.click();
  });
  await act(async () => {
    const select = container.querySelector<HTMLSelectElement>('[aria-label="Task to link"]')!;
    select.value = "task-1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent === "Link",
    )?.click();
  });
  expect(setTaskLink).toHaveBeenCalledWith("task-1", "synthetic", true);
  expect(container.querySelector('[aria-label="Task to link"]')).toBeNull();
});

it("unlinks a related task without deleting it", async () => {
  const setTaskLink = vi.fn().mockResolvedValue(true);
  await render("Original", true, [{
    id: "task-1",
    title: "Review release",
    description: "",
    status: "todo",
    createdAt: "",
    updatedAt: "",
    noteIds: [],
    bookmarkIds: ["synthetic"],
  }], setTaskLink);
  await act(async () => {
    container.querySelector<HTMLButtonElement>("#links-tab-tasks")?.click();
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[aria-label="Unlink task Review release"]')?.click();
  });
  expect(setTaskLink).toHaveBeenCalledWith("task-1", "synthetic", false);
});
