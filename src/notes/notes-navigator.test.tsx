// Verifies the Notes folder tree's disclosure state follows the viewed note
// while still allowing a user to expand and collapse folders manually.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoIndex } from "./notes-demo";
import { NotesNavigator } from "./notes-navigator";

describe("NotesNavigator", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(
    activeFolder: string,
    onCreate = vi.fn(),
    onDeleteFolder = vi.fn(),
    workspace: FileSystemDirectoryHandle | null = null,
  ) {
    act(() =>
      root.render(
        <NotesNavigator
          index={demoIndex}
          view="all"
          folder=""
          activeFolder={activeFolder}
          workspace={workspace}
          recentCount={0}
          favoritesCount={0}
          demo
          onView={vi.fn()}
          onFolder={vi.fn()}
          onCreate={onCreate}
          onDeleteFolder={onDeleteFolder}
          onClose={vi.fn()}
        />,
      ),
    );
  }

  it("starts closed without a viewed note and allows manual disclosure", () => {
    render("");
    const work = container.querySelector<HTMLButtonElement>(
      '[aria-label="Expand Work"]',
    );
    expect(work?.getAttribute("aria-expanded")).toBe("false");
    expect(
      container.querySelector('[aria-label="Expand Infrastructure"]'),
    ).toBeNull();

    act(() => work?.click());
    expect(
      container.querySelector('[aria-label="Collapse Work"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Expand Infrastructure"]'),
    ).not.toBeNull();
  });

  it("opens the viewed note's ancestors without resetting manual disclosure", () => {
    render("Work/Infrastructure/Lab");
    expect(
      container.querySelector('[aria-label="Collapse Work"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Collapse Infrastructure"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Expand Personal"]'),
    ).not.toBeNull();

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Collapse Work"]')
        ?.click(),
    );
    render("Work/Infrastructure/Lab");
    expect(
      container.querySelector('[aria-label="Expand Work"]'),
    ).not.toBeNull();

    render("Personal/Ideas");
    expect(
      container.querySelector('[aria-label="Expand Work"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Collapse Personal"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Expand Infrastructure"]'),
    ).toBeNull();

    render("Work/Infrastructure/Lab");
    expect(
      container.querySelector('[aria-label="Collapse Work"]'),
    ).not.toBeNull();
  });
  it("scopes actions to each folder and never offers root deletion", () => {
    const onCreate = vi.fn();
    const onDeleteFolder = vi.fn();
    render("", onCreate, onDeleteFolder);
    expect(
      container.querySelector('[aria-label="Actions for Demo workspace"]')
        ?.parentElement?.textContent,
    ).not.toContain("Delete folder");

    const personal = container.querySelector<HTMLElement>(
      '[aria-label="Actions for Personal"]',
    );
    act(() => personal?.click());
    const menu = personal?.parentElement;
    act(() => menu?.querySelectorAll<HTMLButtonElement>("button")[0]?.click());
    expect(onCreate).toHaveBeenCalledWith("note", "Personal");

    act(() => personal?.click());
    act(() => menu?.querySelectorAll<HTMLButtonElement>("button")[2]?.click());
    expect(onDeleteFolder).toHaveBeenCalledWith("Personal");
  });
  it("resets disclosures when the workspace changes", () => {
    const first = { name: "First" } as FileSystemDirectoryHandle;
    const second = { name: "Second" } as FileSystemDirectoryHandle;
    render("Work/Infrastructure/Lab", vi.fn(), vi.fn(), first);
    expect(
      container.querySelector('[aria-label="Collapse Work"]'),
    ).not.toBeNull();
    render("Work/Infrastructure/Lab", vi.fn(), vi.fn(), second);
    expect(
      container.querySelector('[aria-label="Expand Work"]'),
    ).not.toBeNull();
    render("Personal/Ideas", vi.fn(), vi.fn(), second);
    expect(
      container.querySelector('[aria-label="Collapse Personal"]'),
    ).not.toBeNull();
  });
});
