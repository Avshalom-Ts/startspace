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
      demo={false} tags={[]} metadataEnabled={true} remoteImagesBlocked={false}
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
      button.textContent?.startsWith("links"),
    )?.click();
  });
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

it("warns in the information tab when this note has blocked remote images", async () => {
  await act(async () => root.render(
    <NotesInspector
      note={{ id: "Plans/release.md", title: "Release", content: "", folder: "Plans", modifiedAt: "2026-10-13T00:00:00.000Z" }}
      demo={false} tags={[]} metadataEnabled={true} remoteImagesBlocked
      onAddTag={vi.fn().mockResolvedValue(true)} onRemoveTag={vi.fn()}
      links={[]} availableBookmarks={[]} tasks={[]} availableTasks={[]}
      taskError={null} bookmarkError={null} bookmarkMetadataEnabled={true}
      busy={false} onLinkTask={vi.fn()} onSetBookmarkLink={vi.fn()}
      legacyBookmarkLinksAvailable={false} onMigrateLegacyBookmarkLinks={vi.fn()}
      onClose={vi.fn()}
    />,
  ));
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Remote images blocked",
  );
  expect(container.textContent).toContain("Settings > Notes");
});

it("keeps the table of contents in Info and moves tags to their own tab", async () => {
  const onSelectHeading = vi.fn();
  await act(async () => root.render(
    <NotesInspector
      note={{ id: "Plans/release.md", title: "Release", content: "# Overview\n\n## Timeline", folder: "Plans", modifiedAt: "2026-10-13T00:00:00.000Z" }}
      demo={false} tags={["release"]} metadataEnabled={true} remoteImagesBlocked={false}
      onAddTag={vi.fn().mockResolvedValue(true)} onRemoveTag={vi.fn()}
      links={[]} availableBookmarks={[]} tasks={[]} availableTasks={[]}
      taskError={null} bookmarkError={null} bookmarkMetadataEnabled={true}
      busy={false} onLinkTask={vi.fn()} onSetBookmarkLink={vi.fn()}
      legacyBookmarkLinksAvailable={false} onMigrateLegacyBookmarkLinks={vi.fn()}
      onSelectHeading={onSelectHeading}
      onClose={vi.fn()}
    />,
  ));
  expect(container.querySelector('[aria-label="Note headings"]')?.textContent).toContain(
    "Timeline",
  );
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>('[aria-label="Go to heading Timeline"]')
      ?.click();
  });
  expect(onSelectHeading).toHaveBeenCalledWith("Timeline");
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.startsWith("tags"),
    )?.click();
  });
  expect(container.textContent).toContain("release");
  expect(container.querySelector('[aria-label="Note headings"]')).toBeNull();
});

it("filters the bookmark dropdown by title and URL", async () => {
  await render();
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.startsWith("links"),
    )?.click();
  });
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
