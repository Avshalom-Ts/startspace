import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LinksGrid, type LinksLayout } from "./links-grid";
import { EMPTY_FILTERS } from "./links-view";
import { emptyBookmarkMetadata } from "./bookmark-metadata-model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const inspect = vi.fn();
const select = vi.fn();
const open = vi.fn();
const node = { id: "synthetic", title: "Example", url: "https://example.com" };

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  inspect.mockReset();
  select.mockReset();
  open.mockReset().mockImplementation((_node, event) => event?.preventDefault());
});
afterEach(async () => { await act(async () => root.unmount()); });

async function render(layout: LinksLayout, description?: string, selected = false) {
  await act(async () => root.render(<LinksGrid
    title="All Links" items={[{ node, folderTitle: "" }]} totalBeforeFilters={1}
    metadata={{ [node.id]: { ...emptyBookmarkMetadata(), description } }}
    selectedId={selected ? node.id : null} layout={layout} sort="name-asc"
    allowBrowserOrder={false} recentView={false} filters={EMPTY_FILTERS}
    emptyMessage="" showAddOnEmpty foldersHidden={false}
    onShowFolders={vi.fn()} onLayout={vi.fn()} onSort={vi.fn()}
    onFilters={vi.fn()} onClearFilters={vi.fn()} onSelect={select}
    onInspect={inspect} onToggleFavorite={vi.fn()} onOpen={open}
    onEdit={vi.fn()} onDelete={vi.fn()} onAddBookmark={vi.fn()} onTagClick={vi.fn()}
  />));
}

it.each(["grid", "list"] as const)("shows a clamped plain-text description in %s view", async (layout) => {
  const description = "<script>Plain text only</script> " + "Long description. ".repeat(30);
  await render(layout, description);
  const preview = container.querySelector(".line-clamp-2");
  expect(preview?.textContent).toBe(description.trim());
  expect(preview?.querySelector("script")).toBeNull();
  expect(container.querySelector('[aria-label="Read more about Example"]')).not.toBeNull();
});

it.each([undefined, "", "   "])("omits previews and Read more for absent descriptions", async (description) => {
  await render("grid", description);
  expect(container.querySelector(".line-clamp-2")).toBeNull();
  expect(container.querySelector('[aria-label="Read more about Example"]')).toBeNull();
});

it.each([false, true])("opens the inspector without toggling or navigating (selected: %s)", async (selected) => {
  await render("grid", "Example description", selected);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Read more about Example"]')!.click());
  expect(inspect).toHaveBeenCalledWith(node.id);
  expect(select).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});

it("preserves the card link and info-button behavior", async () => {
  await render("list", "Example description");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Show details for Example"]')!.click());
  expect(select).toHaveBeenCalledWith(node.id);
  expect(inspect).not.toHaveBeenCalled();
  const link = container.querySelector<HTMLAnchorElement>('[data-link-id="synthetic"]')!;
  expect(link.getAttribute("href")).toBe(node.url);
  await act(async () => link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(open).toHaveBeenCalledWith(node, expect.anything());
});
