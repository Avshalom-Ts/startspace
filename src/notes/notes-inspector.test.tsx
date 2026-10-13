// Exercises bookmark relationship controls in the Notes information pane.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotesInspector } from "./notes-inspector";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); });

async function render(onSetBookmarkLink = vi.fn()) {
  await act(async () => root.render(
    <NotesInspector
      note={{ id: "Plans/release.md", stableId: "note-1", title: "Release", content: "", folder: "Plans", modifiedAt: "2026-10-13T00:00:00.000Z" }}
      demo={false} tags={[]} metadataEnabled={true}
      onAddTag={vi.fn().mockResolvedValue(true)} onRemoveTag={vi.fn()}
      links={[]}
      availableBookmarks={[
        { id: "bookmark-1", title: "Release guide", url: "https://example.com/release" },
        { id: "bookmark-2", title: "Architecture", url: "https://example.com/architecture" },
      ]}
      tasks={[]} availableTasks={[]} taskError={null} bookmarkError={null}
      bookmarkMetadataEnabled={true} busy={false} onLinkTask={vi.fn()}
      onSetBookmarkLink={onSetBookmarkLink}
      legacyBookmarkLinksAvailable={false} onMigrateLegacyBookmarkLinks={vi.fn()}
      onClose={vi.fn()}
    />,
  ));
  return onSetBookmarkLink;
}

it("links a current browser bookmark from the Notes pane", async () => {
  const onSetBookmarkLink = await render();
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Link existing bookmark"),
    )?.click();
  });
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Release guide"),
    )?.click();
  });
  expect(onSetBookmarkLink).toHaveBeenCalledWith("bookmark-1", true);
});

it("filters the bookmark dropdown by title and URL", async () => {
  await render();
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Link existing bookmark"),
    )?.click();
  });
  const search = container.querySelector<HTMLInputElement>('[aria-label="Search bookmarks to link"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      ?.set?.call(search, "architecture");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(container.textContent).toContain("Architecture");
  expect(container.textContent).not.toContain("Release guide");
});
