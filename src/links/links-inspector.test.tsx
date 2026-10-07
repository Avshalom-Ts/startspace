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
async function render(description: string, available = true) {
  await act(async () => root.render(<LinksInspector
    node={{ id: "synthetic", title: "Synthetic", url: "https://example.com" }}
    meta={{ ...emptyBookmarkMetadata(), description }}
    folderPath="" notes={[]} tasks={[]}
    metadataAvailable={available}
    onClose={vi.fn()} onToggleFavorite={vi.fn()} onUpdateMetadata={vi.fn().mockResolvedValue(undefined)}
    onOpen={vi.fn()} onCopy={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onTagClick={vi.fn()}
    onFetchDescription={fetch}
  />));
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
